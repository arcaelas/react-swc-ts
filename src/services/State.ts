import React from 'react'
import { clone, merge } from '@arcaelas/utils'

export type Listener<S> = Noop<[ IState<S>, IState<S> ]>
export type DispatchState<S> = (state: DispatchParam<S>)=> void
export type DispatchParam<S> = IState<S> | ((current: IState<S>)=> IState<S>)

export type IState<S> = S extends never | null | undefined ? NonNullable<S> : (
	S extends Array<never | null | undefined> ? any[] : (
		S extends Array<any> ? S : (
			S extends object ? Partial<S> & Record<string, any> : S
		)
	)
)


export default interface State<S extends null | any[] | IObject = IObject> {
	(): [ IState<S>, DispatchState<S> ]
	onChange(handler: Listener<S>, validator?: Noop<[ IState<S>, IState<S> ], boolean>): ()=> void
	set(state: DispatchParam<S>): void
}
/**
 * @description Use this function to create a data store that can be called from any component,
 * this store can be updated even from outside a React component.
 * @example
 * const useStore = new State({
 * 	name:'anonymous',
 * 	followers: 100
 * })
 * 
 * function ProfileComponent(){
 * 	const [ state, setState ] = useStore()
 * 	return <div>
 * 		Hi {state.name},
 * 		<span children='click' onClick={()=> setState({ folowers: state.folowers + 1 })} /> here for increment your followers!
 * 	</div>
 * }
 * @description
 * If the initial value of a store is an array,
 * it will always be treated as an array,
 * it is important to know that arrays are mutable and trigger an event when modified.
 * @example
 * const useStore = new State([])
 * function MyShops(){
 * 	const [ shops, setShops ] = useStore()
 * 	return <>
 * 		<button onClick={()=> setShops(shops.slice(1))}> Remove first shop </button>
 * 		<ul>
 * 			{shops.map(shop=> <li> { shop.name } </li>)}
 * 		</ul>
 * 		<button onClick={()=> shops.pop()}> Remove last shop </button>
 * 	</>
 * }
 * 
*/
export default class State<S extends null | any[] | IObject = IObject> extends Function {
	constructor(public state: S) {
		super("...args", "return this.useHook(...args)")
		return this.bind(this)
	}

	private events = new EventTarget()
	private listen(handler: any) {
		const subscriptor = ({ detail }: any) => handler(...detail)
		this.events.addEventListener('state', subscriptor)
		return () => this.events.removeEventListener('state', subscriptor)
	}
	private emit(...detail: any) {
		return this.events.dispatchEvent(new CustomEvent('state', { detail }))
	}

	private queue = new Set()
	/**
	 * @description
	 * Stores also accept listeners to subscribe to changes anywhere in the DOM,
	 * inside and outside of components.
	 * @example
	 * useProfileStore.onChange((state, prevState)=>{
	 *   console.log('Your profile was changed!')
	 * })
	 * @description
	 * The listener can be intercepted by a validator to determine if a change needs to be monitored.
	 * @example
	 * useProfileStore.onChange(profile=>{
	 * 	console.log('Your name was chaned!')
	 * 	axios.post(`/${ profile.id }/update`, {
	 *      data: profile
	 *  })
	 * }, (state, prev)=> state.name !== prev.name) // Only when name is changed.
	 * @description
	 * You can also use string name of property.
	 * @example
	 * useProfileStore.onChange(profile=>{
	 * 	console.log('Your name was chaned!')
	 * 	axios.post(`/${ profile.id }/update`, {
	 *      data: profile
	 *  })
	 * }, [ 'name' ]) // Only when name is changed.
	 */
	onChange(handler: any, validator: any) {
		validator = validator ? (
			validator instanceof Array ? (a: any, b: any) => (validator as any).some((k: string) => a?.[k] !== b?.[k]) : validator
		) : Boolean.bind(null, 1)
		const subscriptor = (b: any, c: any) => (validator as any)(b, c) && handler(b, c)
		this.queue.add(subscriptor)
		return () => this.queue.delete(subscriptor)
	}

	/**
	 * @description
	 * You can also update the state of the store while outside of a component.
	 * @example
	 * window.onload = ()=>{
	 * 	useStore.set({ ready: true })
	 * }
	 */
	set(state: any) {
		if(this.state === state) return
		const current = clone( this.state )
		state = typeof state==='function' ? state( current ) : state
		this.state = this.state as any instanceof Array ? [].concat(state) : (
			typeof (this.state??false) === "object" ? merge({}, current, state) : state
		)
		for (const cb of this.queue as any)
			cb(this.state, current)
		this.emit(this.state)
		return
	}

	/**
	 * @description
	 * Use this method to call ReactJS useState.
	 */
	protected useHook() {
		const [ state, setState ] = React.useState(this.state)
		React.useEffect(() =>
			this.listen((o: any) => setState(o)),
			[state, setState])
		return [ state, this.set ]
	}
}