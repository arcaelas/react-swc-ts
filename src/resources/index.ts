import React from 'react'
import merge from 'lodash/merge'
import Socket from "~/services/Socket"
import State, { type IState, type DispatchState } from "~/services/State"

interface Signal {
	[K: string]: any
	signal: AbortSignal
	abort(): void
}
const signals: Record<string, Signal> = {}
/**
 * @description
 * With Signal you can abort some fetch or request from hooks or components without initiate new instance.
 * @example
 * 
 * function AccountBalance(){
 * 	const signal = useSignal('account:balance')
 * 	const [ balance, setBalance ] = React.useState( 0 )
 * 
 * 	React.useEffect(()=>{
 *  	fetch({
 * 			...,
 * 			signal: signal.signal,
 * 		})
 * 		return ()=>{
 * 			signal.abort()
 * 		}
 * 	}, [ ])
 * 	
 * 	return <>{ balance }</>
 * }
 * 
 */
export function useSignal(key: string): Signal {
	return signals[ key ] ||= {
		con: new AbortController(),
		get signal(){
			if(this.con.signal.aborted)
				this.con = new AbortController()
			return this.con.signal
		},
		get abort(){
			return this.con.abort
		},
	}
}

/**
 * @description
 * useSocket allows you to create a WebSocket instance to manipulate connections within your components.
 * @example
 * export function AccountBalance({ value }){
 * 	const [ balance, setBalance ] = React.useState( value )
 * 	const socket = useSocket('wss://url')
 * 	
 * 	React.useEffect(()=>{
 * 		const unbind = socket.message((payload)=>{
 * 			if(payload.type === 'balance_changed'){
 * 				setBalance(payload.value)
 * 			}
 * 		})
 * 		return unbind
 * 	}, [ socket, setBalance ])
 * 
 * 	return <div>
 * 		Current Balance: { balance }
 * 	</div>
 * }
 */
export const useSocket = (url: string, protocols?: string | string[])=> Socket.static(url, protocols)

/**
 * @description
 * This Hook load a state offset components, you can call this hook calling variable declaration, all components
 * that have this hook inside, will be updated.
 * @example
 * const useProfile = createStore({
 * 	name: "Arcaelas Insiders"
 * })
 * 
 * 
 * function UpdateProfile(){
 * 	const [ profile, setProfile ] = useProfile()
 * 	const changeName = ()=>{
 * 		setProfile({ name: "Hola mundo!" })
 * 	}
 * 	return <button onClick={changeName}>Set name to "Hola mundo!"</button>
 * }
 * 
 * function AccountCard(){
 * 	const [ profile, setProfile ] = useProfile()
 * 
 * 	return <>{ profile.name }</>
 * }
 */
export const createStore = <S extends ConstructorParameters<typeof State> = any>(state: S): State<S> => new State( state as any )

export function useObject<P extends IObject = IObject>(object: P): [ IState<P>, DispatchState<P> ]{
	const [ state, _set ] = React.useState<any>( object )
	const setState = React.useCallback((n: any)=>
		_set((c: any)=> merge({}, typeof n === 'function' ? n(c) : n))
	, [ _set ])
	return [ state, setState ]
}