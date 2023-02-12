/// <reference types="vite/client" />
import type { RecaptchaVerifier } from "firebase/auth"


declare global {

    interface Window {
        grecaptcha: any
        recaptchaVerifierID: string
        recaptchaVerifier: RecaptchaVerifier
    }

    type Optional<T> = {
        [K in keyof T]?: T[K]
    }
    
    type PromiseResult<T> = T extends Promise<infer P> ? PromiseResult<P> : T
    type IObject = Record<string | number | symbol, any>
    type Noop<P extends any = any, R extends any = any> = (...args: P) => (R | Promise<R>)
    type Bind<T extends any, F extends Noop> = (this: T, ...args: Parameters<F>) => ReturnType<F>
}