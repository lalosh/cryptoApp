(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//include before everything


// const symCrypto = require('./symCrypto/symCrypto.js');
// const asymCrypto = require('./asymCrypto/asymCrypto.js');

let socket = io();

socket.on('testAPI',function(o,k){
  let b = new cryptoAPI('AES');
  b.importKey(k)
  .then(function(key){
    
    console.log('----object to array buffer----')
    let buff = new ArrayBuffer(16);
    for(let i=0;i<16;i++){
      buff[i] = o.iv[i]
    }
    let view = new Uint8Array(buff);
    console.log('--------')
    
    b.decrypt(o.cipherText, view)
    .then(function(theOriginalMsg){
      console.log(arrayBufferToString(theOriginalMsg))
    })
  })
})


socket.on('sendMsg',function(msg,username){
  if(!username) username= "unknown";
  

  recvMsg(msg, username);
});

socket.on('newUsername',function(username){
    addOnlinePerson(username);
});

socket.on('sendPublicKey',function(publicKey){
  console.log('received from server!!');
  console.log(publicKey);
    
    crypto.subtle.importKey(
      "spki",
      publicKey,
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
        hash: {name: "SHA-256"}
      },
      true,
      ["encrypt"]
    )
    .then(function(e){
        console.log('after importing!');
        console.log(e);
    }, function(e){
        console.log(e);
    });

})

Vue.component('loginForm', {

  props:['username'],

  template:`
  <div v-if="!username" class="loginForm">

      <input type="text" v-on:keyup.enter="changeUserName">
      <button v-on:click="changeUserName">log in</button>

  </div>

  <div class="loginForm" v-else>

    <p>Hello,{{username}}!  </p>

  </div>
  `,

  methods:{
    changeUserName: function(){
      cryptoApp.username = $('.loginForm :input').val();


      //send username to server with public key
      //request all user list
      socket.emit('newUsername', cryptoApp.username);
    }
  }

});

Vue.component('people',{

  props:['peopleArray'],

  template:`
  <div class="people">

      <div class="person" v-for="i in peopleArray" :key="i.id">
          <h3>{{i.name}}</h3>
          <span>is typing...</span>
      </div>

  </div>
  `
})

Vue.component('online',{

    props:['peopleArray','username'],

    template:`
    <aside>
      <loginForm :username='username'></loginForm>
      <people :peopleArray='peopleArray'></people>
    </aside>
    `
})

Vue.component('cryptoInfo',{

  props:['cryptoType','cryptoAlgo','cryptoKeySize'],

  template:`
  <div class="cryptoInfo">
      <span v-if="cryptoType">Crypto-Type</span>
      <span v-if="cryptoAlgo">Algorithm</span>
      <span v-if="cryptoKeySize">Key size</span>

      <h3 v-if="cryptoType">{{cryptoType}}</h3>
      <h3 v-if="cryptoAlgo">{{cryptoAlgo}}</h3>
      <h3 v-if="cryptoKeySize">{{cryptoKeySize}}-bit</h3>
  </div>
  `
})

Vue.component('secretKey',{

  props:['secretKey'],

  template:`
  <div class="secretKey">
    <h2>your key is:</h2>

    <input v-if="editBoolean" type="text" :value="secretKey" @keyup.enter="changeSecretKey"></input>
    <h3 v-else>{{secretKey}}</h3>

    <button v-if="!editBoolean"
            v-on:click="editButton"
            >edit</button>
    <button v-else
            v-on:click="changeSecretKey"
            >save</button>

  </div>
  `,

  data:function(){
    return {editBoolean:false}
  },

  methods:{

    changeSecretKey: function(){
      this.editBoolean = false;
      cryptoApp.secretKey = $('.secretKey :input').val();
      //send new secret key via RSA
      /**/
      let a = new cryptoRSA();
      let publicKey,privateKey;

      a.createKeyPair()
      .then(function(){


          publicKey = a.getPublicKey();
          privateKey = a.getPrivateKey();
          console.log('~~',publicKey);
          // console.log(privateKey);
          //send publicKey
          crypto.subtle.exportKey("spki", publicKey)
          .then(function(result){
              console.log((result));
              socket.emit('sendPublicKey', (result));
          },
          function(err){
              console.log(err);
          })

          
          // a.encrypt("hello man,is this good?", a.getPublicKey())
          // .then(function(cipher){
              
          //     a.decrypt(cipher, a.getPrivateKey())
          //     .then(function(plaintext){
          //         console.log(arrayBuffer2String(plaintext));

          //     })
          
          // });

      })

      /**/
    },

    editButton: function(){
      this.editBoolean = true;
    }
  }
})

Vue.component('chatBoxEnc',{

  props:['publicMsgEnc','realTimeEncMsg'],

  template:`
  <div class="chatBox chatBoxEnc">

    <div class="msgArea">

        <span v-for="i in publicMsgEnc" :class="i.state">{{i.msg}}</span>

    </div>

    <div class="inputArea inputAreaEnc">
      <span>{{realTimeEncMsg}}</span>
    </div>

  </div>
  `,

})

Vue.component('chatBox',{

  props:['value','publicMsg'],

  template:`
  <div class="chatBox">

    <div class="msgArea">

        <span v-for="i in publicMsg" :class="i.state">{{i.msg}}</span>

    </div>

    <div class="inputArea">
        <input type="text" @keyup.enter="sendMsg" :value="value" @input="$emit('input',$event.target.value)">
        <button @click="sendMsg">send</button>
    </div>

  </div>
  `,

  methods:{
    sendMsg: function(){
      this.$emit('sendMsg');
    },
  }

})

Vue.component('fileArea',{

  template:`
  <div class="fileArea" id="drop_zone" ondrop="drop_handler(event);" ondragover="dragover_handler(event);" ondragend="dragend_handler(event);">
    <strong>Drag one or more files to this Drop Zone ...</strong>
  </div>
  `
})


var cryptoApp = new Vue({

  el:'#cryptoApp',

  data:{

    cryptoType:'Symmetric',
    cryptoAlgo:'RC4',
    cryptoKeySize: '255',

    secretKey:'default key',

    publicKey:'',
    privateKey:'',

    peopleArray:[


    ],
    username:'',

    publicMsg:[

    ],
    publicMsgEnc:[

    ],
    realTimeMsg:'',


  },

  template:`
  <div id='cryptoApp'>
    <div class="line"></div>
    <online :peopleArray='peopleArray' :username='username'></online>
    <div class="col-2-3">
      <cryptoInfo :cryptoType="cryptoType" :cryptoAlgo="cryptoAlgo" :cryptoKeySize="cryptoKeySize"></cryptoInfo>
      <secretKey :secretKey="secretKey"></secretKey>
      <chatBox :publicMsg="publicMsg" v-model="realTimeMsg" v-on:sendMsg="sendMsg"></chatBox>
      <chatBoxEnc :publicMsgEnc="publicMsgEnc" :realTimeEncMsg="realTimeEncMsg"></chatBoxEnc>
      <fileArea></fileArea>
    </div>
  </div>
  `,

  computed:{
    realTimeEncMsg:function(){
      if(this.realTimeMsg){

        let symCryptoInstance = new symCrypto();
        symCryptoInstance.changePassword(this.secretKey);
        let res = symCryptoInstance.encrypt(this.realTimeMsg);
        return res;
      }
      else
        return "";

    }
  },

  methods:{
    sendMsg: function(){

      cryptoApp.publicMsg.push({msg:this.realTimeMsg, state:'out'});
      cryptoApp.publicMsgEnc.push({msg:this.realTimeEncMsg, state:'out'});



      //send real time enc msg
      //io

      if(cryptoApp.username == 'anas') {
        console.log('hi anas');
        socket.emit('tolouay',this.realTimeEncMsg, this.username);
        
      }
      else{
        //what original was here
        socket.emit('sendMsg',this.realTimeEncMsg, this.username);
        
        let a = new cryptoAPI('AES');
        a.generateKey()
        .then(function(key){
          a.encrypt(stringToArrayBuffer('hello this is a test for the api'))
          .then(function(cipherObj){

            a.exportKey()
            .then(function(theKeyToExport){
              socket.emit('testAPI', cipherObj, theKeyToExport);
              console.log('message sent');
            })

          })
        })
        
      }
    
      cryptoApp.realTimeMsg="";

    },//sendMsg
  },
  watch:{
    publicMsg: function(){

      setTimeout(function () {
        let a = document.querySelectorAll('.msgArea')[0];
        a.scrollTop = a.scrollHeight;

        let b = document.querySelectorAll('.msgArea')[1];
        b.scrollTop = b.scrollHeight;
      }, 0);

    },
    publicMsgEnc: function(){

      setTimeout(function () {
        let a = document.querySelectorAll('.msgArea')[0];
        a.scrollTop = a.scrollHeight;

        let b = document.querySelectorAll('.msgArea')[1];
        b.scrollTop = b.scrollHeight;
      }, 0);

    }
  }
})









//io
function addOnlinePerson(personName){

  let newId = cryptoApp.peopleArray.length;

  let newPerson = {
    id: newId,
    name: personName
  };

  cryptoApp.peopleArray.push(newPerson);
}

//io
function removeOnlinePerson(personName){

  let tmp = [];

  while(cryptoApp.peopleArray[cryptoApp.peopleArray.length-1].name != personName)
    tmp.push(cryptoApp.peopleArray.pop());

  cryptoApp.peopleArray.pop();

  while(tmp.length)
    cryptoApp.peopleArray.push(tmp.pop());

}



//io
function recvMsg(text,username){

  cryptoApp.publicMsgEnc.push({msg:( username+": "+ text), state:'in'});

  let a = new symCrypto();
  a.changePassword(cryptoApp.secretKey);


  cryptoApp.publicMsg.push({msg: (username+": "+a.decrypt(text)), state:'in'});

}
},{}]},{},[1]);
