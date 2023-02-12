import { type User as IAuth, onAuthStateChanged as watchSession, signOut as SignOut, signInWithPhoneNumber, updateProfile, PhoneAuthProvider } from "firebase/auth"
import { promify } from "@arcaelas/utils"
import { auth, reCaptcha } from "~/services/Firebase"
import EventBucket from "./EventBucket"
import React from "react"
import State from "./State"


/**
 * An interface as JSON-serializable representation of this object.
 */
export interface User {
    [K: string]: any
    id: string
    email: string
    photoURL: string
    displayName: string
    phoneNumber: string
}


const session = promify(),
    _listeners = new EventBucket()
let provider = null as null | IAuth,
    user = null as null | User;
watchSession(auth, state => {
    provider = state || null
    user = provider?.toJSON() as any
    _listeners.emit('auth_changed', user)
    session.resolve()
})



type FnInput = Noop<[ user?: IAuth, ...args: any ]>
type FnOutput<I extends FnInput> = I extends (a: any, ...b: infer T)=> Promise<any>
    ? (...args: T)=> Promise<PromiseResult<ReturnType<I>>>
    : (I extends (a: any, ...b: infer T)=>any
        ? (...args: T)=> PromiseResult<ReturnType<I>>
        : (...args: Parameters<I>)=> ReturnType<I>
    )
export function onAuthStateReady<H extends FnInput>(callback: H): FnOutput<H>
export function onAuthStateReady(handler: any) {
    return async (...params: any) => {
        try {
            await session
            return handler(provider, ...params)
        }
        catch (error) {
            _listeners.emit('error', error)
            throw error
        }
    }
}



export const onAuthStateChanged = (handler: Noop<[null | User]>) => _listeners.on('auth_changed', handler)

export async function signUp(props: User) {
    return signIn(props as any)
}

export async function signIn({ phoneNumber }: User) {
    if (!phoneNumber) throw new Error("Phone number must be typed.")
    const appVerifier = await reCaptcha
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier.widget)
    return async function (code: string) {
        try {
            const result = await confirmation.confirm(code)
            user = (provider = result.user).toJSON() as any
            return user as User
        } catch (error) {
            await appVerifier.reset()
            throw error
        }
    }
}

export async function signOut() {
    await SignOut(auth)
}

export const update = onAuthStateReady(async function update(user, { phoneNumber, ...profile }: Optional<User>) {
    if (!user) throw new Error('User must be logged!')
    return updateProfile(user, profile)
})

export const changeAuthCredential = onAuthStateReady(async function changeAuthCredential(user, phoneNumber: string) {
    // if (!user) throw new Error("User is not logged")
    // else if (!phoneNumber) throw new Error("Phone number must be placed.")
    // const appVerified = await reCaptcha
    // const provider = new PhoneAuthProvider(auth)
    // const id = await provider.verifyPhoneNumber(phoneNumber, appVerified.widget)
    // return async function (code: string) {
        // return await updatePhoneNumber(user,
            // PhoneAuthProvider.credential(id, code)
        // )
    // }
})



// export const useAuth = new State<IAuth>(null as any)

// const client = useAuth.onChange(function (e){ })

const useAuth = new State<IAuth>(null as any)
useAuth()



// useAuth()

export function _useAuth() {
    const [client, setClient] = React.useState(user)
    React.useEffect(() =>
        onAuthStateChanged(e => setClient(e)),
        [setClient])
    return client
}