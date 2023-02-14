export default class Socket {
	private interval: any
	private socket: WebSocket
	static all: Record<string, Socket>
	constructor(url: string | URL, protocols?: string | string[]){
		this.socket = new WebSocket(url, protocols)
		this.interval = setInterval(this.ping.bind(this), 15000)
		this.error(()=>clearInterval(this.interval))
		this.socket.addEventListener('close', ()=>clearInterval(this.interval))
	}

	ping(){
		try {
			this.socket.send('ping')
		} catch (error) {}
	}

	message(handler: Noop<[string]>): Noop
	message(body: string | ArrayBufferLike | Blob | ArrayBufferView): void
	message(input: any){
		if(typeof input==='function'){
			const bind = ({ data }: any)=>{
				try {
					input(JSON.parse( data ))
				} catch (error) {
					input(data)
				}
			}
			this.socket.addEventListener('message', bind)
			return ()=> this.socket.removeEventListener('message', bind)
		}
		this.socket.send(input)
	}

	emit(message: string | ArrayBufferLike | Blob | ArrayBufferView){
		return this.message( message )
	}

	json(input: string | IObject){
		return this.message(JSON.stringify( input ))
	}

	error(handler: Noop<[ error: Event ]>){
		return this.socket.addEventListener('error', handler)
	}

	static static(url: string, protocols?: string | string[]): Socket {
		return Socket.all[`${ protocols }+${ url }`] ||= new Socket(url, protocols)
	}
}