import firebase from 'firebase/app';
import 'firebase/firestore';
import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm-sdk";

// تهيئة Firebase
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDitjQHOczhoSqfKdovHYg9GHA87rng86w",
  authDomain: "devf5r-dmin.firebaseapp.com",
  databaseURL: "https://devf5r-dmin-default-rtdb.firebaseio.com",
  projectId: "devf5r-dmin",
  storageBucket: "devf5r-dmin.appspot.com",
  messagingSenderId: "689450518141",
  appId: "1:689450518141:web:9c3f9217d06f8980079314",
  measurementId: "G-L2MFTD6WPQ"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const roomLimit = 5; // الحد الأقصى لعدد الغرف

const checkRoomAvailability = async (roomId) => {
  const roomRef = db.collection('rooms').doc(roomId);
  const doc = await roomRef.get();
  
  if (doc.exists) {
    const roomData = doc.data();
    if (roomData.userCount < roomData.maxUsers) {
      return true;
    }
    return false;
  }
  return true; // الغرفة غير موجودة، يمكن إنشاؤها
};

const createOrJoinRoom = async (roomId, displayName) => {
  const roomRef = db.collection('rooms').doc(roomId);
  const roomSnapshot = await roomRef.get();

  if (!roomSnapshot.exists) {
    const roomCountSnapshot = await db.collection('rooms').get();
    if (roomCountSnapshot.size >= roomLimit) {
      alert("الحد الأقصى للغرف قد تم الوصول إليه.");
      return;
    }

    // إنشاء غرفة جديدة
    await roomRef.set({
      name: roomId,
      userCount: 1,
      maxUsers: 10,
    });
  } else {
    const roomData = roomSnapshot.data();
    if (roomData.userCount >= roomData.maxUsers) {
      alert("الغرفة ممتلئة.");
      return;
    }

    // تحديث عدد المستخدمين
    await roomRef.update({
      userCount: firebase.firestore.FieldValue.increment(1)
    });
  }

  // متابعة إجراءات Agora RTC/RTM
  initRtc();
  initRtm(displayName);
};

// عند مغادرة الغرفة
const leaveRoom = async (roomId) => {
  const roomRef = db.collection('rooms').doc(roomId);
  await roomRef.update({
    userCount: firebase.firestore.FieldValue.increment(-1)
  });

  // إجراءات الخروج من Agora RTC/RTM
  audioTracks.localAudioTrack.stop();
  audioTracks.localAudioTrack.close();
  rtcClient.unpublish();
  rtcClient.leave();
};

// استدعاء الدالة عند تقديم النموذج
lobbyForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const roomId = e.target.roomname.value.toLowerCase();
  const displayName = e.target.displayname.value;
  await createOrJoinRoom(roomId, displayName);
});
