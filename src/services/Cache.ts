import moment from 'moment'

type Item = { value: any; expireAt: string }
function parse(key: string): string {
    return `cache:${ key }`
}

export function get(key: string, optional: any = null): Item['value'] {
    try {
        const { value, expireAt }: Item = JSON.parse( window.localStorage.getItem( parse( key )) as any )
        if( moment(expireAt).isAfter() )
            return value
    } catch (error) {}
    return optional
}

export function set<V = any>(key: string, value: V, expire?: moment.DurationInputArg1, unit?: moment.unitOfTime.DurationConstructor | undefined): V {
    window.localStorage.setItem(parse( key ), JSON.stringify({
        value,
        expireAt: moment().add( expire, unit )
    }))
    return value as V
}

export function unset(key: string){
    window.localStorage.removeItem( parse( key ) )
}