import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'
import { getMessaging } from 'firebase/messaging'
import { Promify, promify, sleep } from '@arcaelas/utils'
import { indexedDBLocalPersistence, getAuth, RecaptchaVerifier } from 'firebase/auth'

export const firebase = initializeApp({

})

export const auth = getAuth(firebase)
export const database = getDatabase(firebase)
export const firestore = getFirestore(firebase)
export const messaging = getMessaging(firebase)

auth.useDeviceLanguage()
auth.setPersistence(indexedDBLocalPersistence)


export const reCaptcha = promify<{
    widgetID: number
    widget: RecaptchaVerifier
    reset(): Promise<void>    
}>()

window.recaptchaVerifier = (function getVerifier(){
    const recaptchaVerifier = new RecaptchaVerifier('container', {
        size: 'invisible',
        callback: (e: any)=> console.log('ReCaptcha Callback:', e),
        'expire-callback': (e: any)=> console.log('ReCaptcha Expire Callback:', e),
    }, auth)
    window.recaptchaVerifier.render().then(id=> {
        reCaptcha.resolve({
            widgetID: id,
            widget: window.recaptchaVerifier,
            reset: ()=> window.grecaptcha.reset( id ),
        })
    }).catch(error=>{
        console.error('ReCaptcha Error:', error)
        window.recaptchaVerifier = getVerifier()
    })
    return recaptchaVerifier
})()