import firebase from 'firebase/app';
import 'firebase/firestore';
import AgoraRTC from "agora-rtc-sdk-ng";
import AgoraRTM from "agora-rtm-sdk";

// تهيئة Firebase
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
