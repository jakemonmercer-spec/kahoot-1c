const firebaseConfig = {
    apiKey: "AIzaSyBrPKRi5NWA7JRcdbA2YLO4HPR3ULaBlGk",
    authDomain: "quiz1c.firebaseapp.com",
    databaseURL: "https://quiz1c-default-rtdb.firebaseio.com",
    projectId: "quiz1c",
    storageBucket: "quiz1c.firebasestorage.app",
    messagingSenderId: "660786627580",
    appId: "1:660786627580:web:6a552159559d0eef426879"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
