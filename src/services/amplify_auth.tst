import { Auth as Provider } from 'aws-amplify';
import { CognitoUser } from 'amazon-cognito-identity-js';



export interface User {
    [K: string]: any
    id: string
    email: string
    photoURL?: string
    displayName?: string
    phoneNumber?: string
}
type HandlerParam = Noop<[ user: CognitoUser, ...params: any[] ]>
type HandlerCallback<H extends HandlerParam> = H extends (a: any, ...params: infer P)=> (any | Promise<any>)
    ? (...args: P)=> Promise<ReturnType<H>>
    : (...args: Parameters<H>)=> Promise<ReturnType<H>>

interface LoginResult {
    user: null | User
    status:
        Noop<[], boolean> & { type?: "USER:INVALID" | "PASSWORD:INVALID" } |
        Noop<[ code: string ], boolean> & { type?: "MFA" | "USER:UNCONFIRMED" } |
        Noop<[ code: string, password: string ], boolean> & { type?: "PASSWORD:RECOVERY" }
}


export default class Auth {

    private aws = Provider
    public user: null | User = null
    private auth: null | CognitoUser = null
    private attrs: User = {
        id: 'username',
        email: 'email',
        photoURL: 'picture',
        displayName: 'name',
        phoneNumber: 'phone',
    }

    /**
     * @param {Object} props - User Attributes to parse
     * @param {boolean} fromAWS - If true, props must be attributes to AWS, else from AWS
     * @returns {Object}
     */
    private parse(props: any, fromAWS?: boolean) {
        const user = {} as any
        const attrs = fromAWS ? Object.fromEntries(
            Object.entries( this.attrs ).map(([ k, v ])=> [ v, k  ])
        ) : this.attrs
        for(const key in props)
            if( key in attrs)
                user[ attrs[ key ] ] = props[ key ]
        return user
    }

    private async sync(user?: boolean | CognitoUser): Promise<null | User> {
        try {
            if(user || !this.auth){
                this.auth = user instanceof CognitoUser ? user : await this.aws.currentAuthenticatedUser({
                    bypassCache: true
                })
                this.user = this.parse((
                    await this.aws.userAttributes( this.auth )
                ).reduce((o, { Name, Value })=>({ ...o, [Name]: Value }), {}), true)
                this.event.emit('auth_changed', this.user)
            }
        } catch (error) {
            this.auth = this.user = null
            this.event.emit('error', error)
        }
        return this.user
    }
    private handler<H extends HandlerParam = HandlerParam>(handler: H): HandlerCallback<H>
    private handler<H extends HandlerParam = HandlerParam>(refresh: boolean, handler: H): HandlerCallback<H>
    private handler(...args: any[]) {
        let [ refresh, handler ] = args
        return async (...params: any[])=>{
            try {
                await this.sync()
                return (handler ? handler : refresh)(this.auth, ...params)
            } catch (error) {
                this.event.emit('error', error)
                throw error
            }
        }
    }
    get password(){
        return {
            change: this.handler((user, oldPassword: string, newPassword: string)=>
                this.aws.changePassword(user, oldPassword, newPassword)
            ),
            recovery: this.handler(async user=>{
                const username = user.getUsername()
                await this.aws.forgotPassword(username)
                return (code: string, password: string)=>
                    this.aws.forgotPasswordSubmit(username, code, password)
            })
        }
    }

    async signUp({ email, password, ...attr }: User): Promise<User> {
        try {
            const { user } = await this.aws.signUp({
                username: email, 
                password,
                attributes:{ email, ...attr },
                autoSignIn: { enabled: true },
            })
            await this.sync( user )
            return this.user as User
        } catch (error) {
            this.event.emit('error', error)
            throw error
        }
    }

    async signIn(object: User & { password: string }): Promise<LoginResult>
    async signIn(email: string, password: string): Promise<LoginResult>
    async signIn(...props: any){
        const result: LoginResult = { status: null as any, user: null },
            [ username, password ] = props.email ? [ props.email, props.password ] : props
        try {
            result.user = await this.aws.signIn( username, password )
            switch(result.user?.challengeName){
                case 'SMS_MFA':
                case 'SOFTWARE_TOKEN_MFA':
                    result.status = async (code: string)=>{
                        try {
                            await this.aws.confirmSignIn(result.user, code, result.user?.challengeName as any)
                        } catch (error) {
                            this.event.emit('error', error)                            
                            throw error
                        }
                        return true
                    }
                    result.status.type = "MFA"
                    break
                case 'NEW_PASSWORD_REQUIRED':
                    result.status = async (password: string)=>{
                        try {
                            await this.aws.completeNewPassword(result.user, password)
                        } catch (error) {
                            this.event.emit('error', error)                            
                            throw error
                        }
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
            switch(error.code){
                case 'UserNotConfirmedException': 
                    await this.aws.resendSignUp( username )
                    result.status = async (code: string)=>{
                        try {
                            await this.aws.confirmSignUp( username, code )
                        } catch (error) {
                            this.event.emit('error', error)
                            throw error
                        }
                        return true
                    }
                    result.status.type = "USER:UNCONFIRMED"
                break
                case 'PasswordResetRequiredException': 
                    await this.aws.forgotPassword( username )
                    result.status = async (code: string, password: string)=>{
                        try {
                            await this.aws.forgotPasswordSubmit( username, code, password )
                            return true
                        } catch (error) {
                            this.event.emit('error', error)
                            throw error
                        }
                    }
                    result.status.type = "PASSWORD:RECOVERY"
                break
                case 'NotAuthorizedException': 
                    result.status = async ()=> true
                    result.status.type = 'PASSWORD:INVALID'
                break
                case 'UserNotFoundException': 
                    result.status = async ()=> true
                    result.status.type = 'USER:INVALID'
                break
                default:
                    this.event.emit('error', error)
                    throw error
            }
        }
        return result
    }

    async signOut(global?: boolean){
        try {
            await this.aws.signOut({ global })
        } catch (error) {
            this.event.emit('error', error)
            throw error
        }
    }
    
    async update<T extends User = any>({ newpassword, password, ...attributes }: T) {
        try {
            await this.sync()
            if(newpassword){
                if(!password) throw new Error('Please confirm you current password')
                await this.password.change(password, newpassword)
            }
            await this.aws.updateUserAttributes(this.auth, this.parse(attributes, false))
            await this.sync( true )
            return this.user
        } catch (error) {
            this.event.emit('error', error)
            throw error
        }
    }
    
    onAuthStateChange(handler?: Noop<[ User ]>) {
        return this.event.on('auth_changed', handler as any)
    }
}