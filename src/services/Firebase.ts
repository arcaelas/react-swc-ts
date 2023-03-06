import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'
import { getFirestore } from 'firebase/firestore'
import { getMessaging } from 'firebase/messaging'
import { indexedDBLocalPersistence, getAuth, RecaptchaVerifier } from 'firebase/auth'

export const firebase = initializeApp({

})

export const auth = getAuth(firebase)
export const database = getDatabase(firebase)
export const firestore = getFirestore(firebase)
export const messaging = getMessaging(firebase)

auth.useDeviceLanguage()
auth.setPersistence(indexedDBLocalPersistence)

window.recaptchaVerifier = new RecaptchaVerifier("container", {
    size: "invisible",
    callback:(result: any)=> console.log("ReCaptcha resolved:", result),
    "expire-callback":(result: any)=> console.log("ReCaptcha was expired:", result),
})