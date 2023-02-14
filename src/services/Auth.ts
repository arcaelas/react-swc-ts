import React from 'react';
import { Auth, Hub, } from 'aws-amplify';
import EventListener from './EventListener';
import { CognitoUser } from 'amazon-cognito-identity-js';
import { CognitoHostedUIIdentityProvider } from '@aws-amplify/auth'

interface IUser {
    [K: string]: any
    id: string
    name: string
    email: string
    last_name: string

    role: "feligres" | "parroco" | "admin"
    parroquia?: { lat: number, lng: number }
}

interface LoginResult {
    user: null | User
    status:
    Noop<[], boolean> & { type?: "USER:INVALID" | "PASSWORD:INVALID" } |
    Noop<[code: string], boolean> & { type?: "MFA" | "USER:UNCONFIRMED" } |
    Noop<[code: string, password: string], boolean> & { type?: "PASSWORD:RECOVERY" }
}

export class User {
    [K: string]: any
    role: IUser['role'] = "feligres"

    private $json = ["parroquia"]
    private $attrs: string[] = []
    private $custom: string[] = []
    private $user: CognitoUser = null as any

    constructor(user: CognitoUser) {
        this.serialize(user)
    }

    private sync(user: CognitoUser): this
    private sync(user: any) {
        for (const key of this.$attrs) delete this[key]
        this.$user = user
        this.$attrs = this.$custom = []
        for (const prop of user.attributes) {
            let [, custom, key] = prop.Name.replace('sub', 'id').match(/^(custom:)?(\w+)/)
            this.$attrs.push(key)
            if (custom) this.$custom.push(key)
            this[key] = this.$json.includes(key) ? JSON.parse(prop.Value) : prop.Value
        }
        return this
    }

    public handler<T extends Noop<[user: CognitoUser]> = any>(cb: T): ReturnType<T> {
        return cb(this.$user)
    }

    public is(role: string | RegExp) {
        return new RegExp(role).test(this.role)
    }

    async update(props: User) {
        const object = {} as IObject
        for (const key in props) {
            object[
                this.$custom.includes(key) ? "custom:" + key : key
            ] = this.$json.includes(key) ? JSON.stringify(props[key]) : props[key]
        }
        await Auth.updateUserAttributes(this.$user, object)
        return await this.sync(
            await Auth.currentAuthenticatedUser({ bypassCache: true })
        )
    }

    public toJSON() {
        return this.$attrs.reduce((o, k) => ({ ...o, [k]: this[k] }), {} as IUser)
    }
}

let user: IUser | null = null
const channel = new EventListener(),
    json: string[] = ['parroquia'],
    custom = json.concat('role', 'parroquia')

Hub.listen('auth', async ({ payload: { event } }) => {
    switch (event) {
        case 'signIn':
        case 'signUp':
        case 'autoSignIn':
            channel.emit('auth_change', user = await getUser())
            break;
        case 'signOut':
        case 'sessionExpired':
            channel.emit('auth_change', user = null)
            break;
    }
})

type FnInput = Noop<[user: CognitoUser | null, ...args: any]>
type FnOutput<I extends FnInput> = I extends (a: any, ...b: infer T) => Promise<any>
    ? (...args: T) => Promise<PromiseResult<ReturnType<I>>>
    : (I extends (a: any, ...b: infer T) => any
        ? (...args: T) => PromiseResult<ReturnType<I>>
        : (...args: Parameters<I>) => ReturnType<I>
    )
export function onAuthStateReady<H extends FnInput>(callback: H): FnOutput<H>
export function onAuthStateReady(handler: any) {
    return async (...params: any) => {
        return handler(
            await Auth.currentAuthenticatedUser().catch(() => null), ...params
        )
    }
}

export const onAuthStateChanged = (handler: Noop<[IUser | null]>) => channel.on('auth_changed', handler)

export async function getUser(bypassCache: boolean = false) {
    const auth = await Auth.currentAuthenticatedUser({ bypassCache })
    return user = auth.attributes.reduce((a: any, prop: any) => {
        const key = prop.Name.replace('sub', 'id').replace(/^(custom:)?(\w+)/, "$1")
        a[key] = json.includes(key) ? JSON.parse(prop.Value) : prop.Value
        return a
    }, {} as IUser)
}

export async function signUp({ email, password, ...attr }: User) {
    const { user } = await Auth.signUp({
        username: email,
        password,
        attributes: { email, ...attr },
        autoSignIn: { enabled: true },
    })
    return user
}

export async function signInWith(name: keyof typeof CognitoHostedUIIdentityProvider) {
    const response = await Auth.federatedSignIn({
        provider: CognitoHostedUIIdentityProvider[name] || name,
    })
    console.log({ response })
}

export async function signIn(object: User & { password: string }): Promise<LoginResult>
export async function signIn(email: string, password: string): Promise<LoginResult>
export async function signIn(...props: any) {
    const result: LoginResult = { status: null as any, user: null },
        [username, password] = props.email ? [props.email, props.password] : props
    try {
        result.user = await Auth.signIn(username, password)
        switch (result.user?.challengeName) {
            case 'SMS_MFA':
            case 'SOFTWARE_TOKEN_MFA':
                result.status = async (code: string) => {
                    await Auth.confirmSignIn(result.user, code, result.user?.challengeName as any)
                    return true
                }
                result.status.type = "MFA"
                break
            case 'NEW_PASSWORD_REQUIRED':
                result.status = async (password: string) => {
                    await Auth.completeNewPassword(result.user, password)
                    return true
                }
                result.status.type = "PASSWORD:RECOVERY"
                break
            default:
                const error = new Error('User Challenge unsupported') as any
                error.code = 'UserChallengeName unsupported'
                error.user = result.user
                throw error
        }
    } catch (error: any) {
        switch (error.code) {
            case 'UserNotConfirmedException':
                await Auth.resendSignUp(username)
                result.status = async (code: string) => {
                    await Auth.confirmSignUp(username, code)
                    return true
                }
                result.status.type = "USER:UNCONFIRMED"
                break
            case 'PasswordResetRequiredException':
                await Auth.forgotPassword(username)
                result.status = async (code: string, password: string) => {
                    await Auth.forgotPasswordSubmit(username, code, password)
                    return true
                }
                result.status.type = "PASSWORD:RECOVERY"
                break
            case 'NotAuthorizedException':
                result.status = async () => true
                result.status.type = 'PASSWORD:INVALID'
                break
            case 'UserNotFoundException':
                result.status = async () => true
                result.status.type = 'USER:INVALID'
                break
            default:
                throw error
        }
    }
    return result
}

export async function signOut(global?: boolean) {
    await Auth.signOut({ global })
}

export const update = onAuthStateReady(async (auth, props: IUser) => {
    if (!auth) throw new Error("El usuario no está autenticado.")
    const json = ['parroquia'],
        object: IObject = {},
        custom = json.concat("role")
    for (let key in props) {
        object[
            custom.includes(key) ? "custom:" + key : key
        ] = json.includes(key) ? JSON.stringify(props[key]) : props[key]
    }
    await Auth.updateUserAttributes(auth, object)
    return await getUser(true)
})

export function useAuth() {
    const [state, setState] = React.useState(user)
    React.useEffect(() =>
        channel.once('auth_changed', auth =>
            setState(auth)
        )
    ,[ setState ])
    return state
}