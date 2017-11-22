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

//
socket.on('newUsername',function(username, publicKeyED_buffer, publicKeySV_buffer){
    addOnlinePerson(username, publicKeyED_buffer, publicKeySV_buffer);
});
//


//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////

let cryptoAPI_AES = new cryptoAPI('AES');
let cryptoAPI_RSA = new cryptoAPI('RSA');
let digSigAPI_SV = new digSigAPI();

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

      //generate the key for AES
      cryptoAPI_AES.generateKey()
      .then(function(sessionKey){
        cryptoApp.sessionKey = sessionKey;
      })

      //generate the keys for RSA and DS  
      cryptoAPI_RSA.generateKey()
      .then(function(keyPair){
        cryptoApp.publicKeyED = keyPair.publicKey;
        cryptoApp.privateKeyED = keyPair.privateKey;

        //send public key of RSA
        cryptoAPI_RSA.exportKey()
        .then(function(publicKeyED_buffer){

          //generate the keys for Digital Signature
          digSigAPI_SV.generateKey()
          .then(function(keyPair){
            
            cryptoApp.publicKeySV = keyPair.publicKey;
            cryptoApp.privateKeySV = keyPair.privateKey;

            //send public key of DS
            digSigAPI_SV.exportKey()
            .then(function(publicKeySV_buffer){
            
              socket.emit('sendPersonalInfo', cryptoApp.username, publicKeyED_buffer,publicKeySV_buffer);
            })

          })
          //
        })
      })
      

      
  
      //tests
      setTimeout(() => {
        console.log('generating keys done!')
        // console.log(cryptoApp.sessionKey)
        // console.log(cryptoApp.publicKeyED)
        // console.log(cryptoApp.privateKeyED)
        // console.log(cryptoApp.publicKeySV)
        // console.log(cryptoApp.privateKeySV)    
      }, 1000);

    }
  }

});

Vue.component('people',{

  props:['peopleArray'],

  template:`
  <div class="people">

      <div class="person" v-for="i in peopleArray" :key="i.id" v-on:click="changecurrentSelectedUser">
          <h3>{{i.name}}</h3>
          <span>is typing...</span>
      </div>

  </div>
  `,
  methods:{
    changecurrentSelectedUser: function(){
      cryptoApp.currentSelectedUser = this.$el.childNodes[0].childNodes[0].childNodes[0].data;
      console.log('current selection: ', cryptoApp.currentSelectedUser);
    }
  }
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

    encryptedMsgNow: '',
    //public + private key to encrypt / decrypt
    publicKeyED: '',
    privateKeyED: '',
    
    //public + private key to sign / verify    
    publicKeySV: '',
    privateKeySV: '',
    
    //session key by AES
    sessionKey: '',

    //the secret key entered by the user
    //we need a session key and a secret key for each user or what?
    secretKey:'default key',
    
    //current selected user to send msg to
    currentSelectedUser: '',

    cryptoType:'Symmetric',
    cryptoAlgo:'RC4',
    cryptoKeySize: '255',


    publicKey:'',
    privateKey:'',

    //only for names
    peopleArray:[


    ],
    
    //to store personal infos
    allPeople:{},

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
      <chatBox :publicMsg="publicMsg" v-model="realTimeMsg" v-on:sendMsg="sendMsg"></chatBox>
      <chatBoxEnc :publicMsgEnc="publicMsgEnc" :realTimeEncMsg="realTimeEncMsg"></chatBoxEnc>
      <fileArea></fileArea>
    </div>
  </div>
  `,

  computed:{
    realTimeEncMsg:function(){
      if(this.realTimeMsg){
        let res = '';

        cryptoAPI_AES.encrypt(stringToArrayBuffer(this.realTimeMsg))
        .then(function(cipherObject){
          res= cipherObject.cipherText;
          cryptoApp.encryptedMsgNow = arrayBufferToString(res);
          console.log(cryptoApp.encryptedMsgNow);
          
          return res;
        
        })
        
        // let symCryptoInstance = new symCrypto();
        // symCryptoInstance.changePassword(this.secretKey);
        // let res = symCryptoInstance.encrypt(this.realTimeMsg);
        // return res;
      }
      else
        return "";

    }
  },

  methods:{
    sendMsg: function(){

      cryptoApp.publicMsg.push({msg:this.realTimeMsg, state:'out'});
      cryptoApp.publicMsgEnc.push({msg:cryptoApp.encryptedMsgNow, state:'out'});



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
      cryptoApp.encryptedMsgNow = "";

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
function addOnlinePerson(personName, publicKeyED_buffer, publicKeySV_buffer){

  let newId = cryptoApp.peopleArray.length;

  let newPerson = {
    id: newId,
    name: personName
  };

  cryptoApp.peopleArray.push(newPerson);


  socket.on('requestPublicKeySV',function(_publicKeySV){
    obj.publicKeySV = _publicKeySV;
  })
  
  socket.on('requestPublicKeyED',function(_publicKeyED){
    obj.publicKeyED = _publicKeyED;
  })


  cryptoApp.allPeople[personName] = {
    publicKeyED: publicKeyED_buffer,
    publicKeySV: publicKeySV_buffer,
  };

  console.log(cryptoApp.allPeople);
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