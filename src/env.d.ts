/// <reference types="vite/client" />

declare module '*.svg' {
    const src: string
    const ReactComponent: React.Element
    export default src
    export {
        ReactComponent
    }
}

interface Window {
    grecaptcha: any
    recaptchaVerifierID: string
    recaptchaVerifier: RecaptchaVerifier
}

type Optional<T> = {
    [K in keyof T]?: T[K]
}
type IObject = Record<string | number | symbol, any>
type PromiseResult<T> = T extends Promise<infer P> ? PromiseResult<P> : T
type Noop<P extends any = any, R extends any = any> = (...args: P) => (R | Promise<R>)
type Bind<T extends any, F extends Noop> = (this: T, ...args: Parameters<F>) => ReturnType<F>