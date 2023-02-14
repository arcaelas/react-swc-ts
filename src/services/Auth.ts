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
    user: null | IUser
    status:
    Noop<[], boolean> & { type?: "USER:INVALID" | "PASSWORD:INVALID" } |
    Noop<[code: string], boolean> & { type?: "MFA" | "USER:UNCONFIRMED" } |
    Noop<[code: string, password: string], boolean> & { type?: "PASSWORD:RECOVERY" }
}

let user: IUser | null = null
const channel = new EventListener(),
    json: string[] = ['parroquia'],
    custom = json.concat('role')

Hub.listen('auth', async (event) => {
    console.log("AuthEvent:", event)
    switch (event.payload.event) {
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
    return async (...params: any) =>
        Auth.currentAuthenticatedUser({ bypassCache: true })
            .catch(() => null)
            .then(u => handler(u, ...params))
}

export const onAuthStateChanged = (handler: Noop<[IUser | null]>) => channel.on('auth_changed', handler)

function serialize(attrs: IObject, isCognito?: boolean) {
    const object: IObject = {}
    if (isCognito) {
        for (const key in attrs) {
            let value
            try { value = json.includes(key) ? JSON.parse(attrs[key]) : attrs[key] } catch (error) { value = null }
            object[
                key.replace(/^custom:(\w+)/, "$1")
            ] = value
        }
    } else {
        delete attrs.sub
        for (const key in attrs) {
            object[
                (custom.includes(key) ? 'custom:' : '') + key
            ] = JSON.stringify(attrs[key])
        }
    }
    return object
}

export async function getUser(bypassCache = false) {
    const auth = await Auth.currentAuthenticatedUser({ bypassCache })
    return user = serialize(
        auth.attributes.reduce((o: IUser, { Name, Value }: IObject) => ({ ...o, [Name]: Value }), {}), true
    ) as IUser
}

export async function signUp({ email: username, password, ...attr }: IUser) {
    await Auth.signUp({
        username,
        password,
        autoSignIn: { enabled: true },
        attributes: { email: username, ...serialize(attr) },
    })
    return await getUser()
}

export async function signInWith(name: keyof typeof CognitoHostedUIIdentityProvider) {
    const response = await Auth.federatedSignIn({
        provider: CognitoHostedUIIdentityProvider[name] || name,
    })
    console.log({ response })
}

export async function signIn(object: IUser): Promise<LoginResult>
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
    await Auth.updateUserAttributes(auth, serialize(props))
    return getUser(true)
})

export function useAuth() {
    const [state, setState] = React.useState(user)
    React.useEffect(() =>
        channel.once('auth_changed', auth =>
            setState(auth)
        )
        , [setState])
    return state
}