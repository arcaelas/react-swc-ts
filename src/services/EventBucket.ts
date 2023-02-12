interface IEvent {
    namespace: string
    event: string
    handler: Noop
}
type EventType = string | RegExp | IEvent | EventType[]


export default class EventBucket {
    private __event = new EventTarget()

    private bind(handler: Function){
        if(typeof handler !== 'function') throw new Error('Event could not be called "' + typeof handler + '" as Function')
        return handler.toString().match(/^function(\s+)\(/)
            ? handler.bind( this )
                : handler
    }

    public on(event: EventType, handler: Noop) {
        handler = this.bind( handler )
        const events: Array<RegExp | string> = event instanceof RegExp ? [ event ] : String( event ).split(/\||,/g).filter(Boolean)
        const bind: Noop = ({detail:{params,event}}: any)=> (
            events.some(a=> a instanceof RegExp ? (
                event.some((b: string)=> a.test(b))
            ) : event.includes(a)) && handler(...params)
        )
        this.__event.addEventListener('*', bind)
        return ()=>this.__event.removeEventListener('*', bind)
    }

    public once(event: EventType, handler: Noop){
        const self = this
        handler = this.bind( handler )
        const events: Array<RegExp | string> = event instanceof RegExp ? [ event ] : String( event ).split(/\||,/g).filter(Boolean)
        self.__event.addEventListener('*', function bind({detail:{params,event}}: any){
            if(events.some(a=> a instanceof RegExp ? (
                    event.some((b: string)=> a.test(b))
                ) : event.includes(a)) && handler(...params)){
                    self.__event.removeEventListener('*', bind)
                    handler(...params)
                }
        } as Noop)
    }

    public emit(event: string | string[], ...args: any[]) {
        if( args.length === 1 && args[ 0 ] instanceof Error ){
            if( args[0]['stopPropagation' as 'message'] ) return true
            else args[0]['stopPropagation' as 'message'] = true as any
        }
        return this.__event.dispatchEvent(new CustomEvent('*', {
            detail: {
                params: args,
                event: String( event ).split(/\||,/g).filter(Boolean),
            }
        }))
    }
}