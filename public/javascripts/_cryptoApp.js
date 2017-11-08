(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
//include before everything
let drop_handler,dragover_handler,dragend_handler;


// const symCrypto = require('./symCrypto/symCrypto.js');
// const asymCrypto = require('./asymCrypto/asymCrypto.js');

let socket = io();

socket.on('sendMsg',function(msg,username){
  if(!username) username= "unknown";
  recvMsg(msg, username);
});

socket.on('newUsername',function(username){
    addOnlinePerson(username);
});

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
          // console.log(publicKey);
          // console.log(privateKey);
          //send publicKey
          socket.emit('sendPublicKey', publicKey);
          
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
      socket.emit('sendMsg',this.realTimeEncMsg, this.username);

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













$(document).ready(function(){


  console.log('jQuery is running...');

  /*drag and drop file*/
  console.log('hello from drag and drop script');
  var enc = new TextDecoder();

  drop_handler=function (ev) {

    // console.log("Drop");
    ev.preventDefault();

    let filesArray = [];
    var dt = ev.dataTransfer;

    // Use DataTransferItemList interface to access the file(s)
    if (dt.items)
      for (var i=0; i < dt.items.length; i++)
        if (dt.items[i].kind == "file") {

          var f = dt.items[i].getAsFile();

          /**/

          let reader = new FileReader();
          reader.readAsText(f);

          setTimeout(function () {

            // console.log(reader.result);
            // console.log(typeof reader.result);

            //io send file //io recv file is the same
            cryptoApp.publicMsg.push({msg:reader.result, state:'out'});


            // console.log(typeof reader.result);
            let symCryptoInstance = new symCrypto();
            symCryptoInstance.changePassword(cryptoApp.secretKey);
            let res = symCryptoInstance.encrypt(reader.result);

            cryptoApp.publicMsgEnc.push({msg:res, state:'out'});
            //send io the 'res'
            socket.emit('sendMsg',res, cryptoApp.username);
          }, 1000);

          /**/
          filesArray.push(f);
          // console.log(" file[" + i + "].name = " + f.name);
          }

    // Use DataTransfer interface to access the file(s)
     else
          for (var i=0; i < dt.files.length; i++) {
            // console.log(" file[" + i + "].name = " + dt.files[i].name);
          }

  }

  dragover_handler=function (ev) {

    // console.log("dragOver");
    // Prevent default select and drag behavior
    ev.preventDefault();
  }

  dragend_handler = function dragend_handler(ev) {

    // console.log("dragEnd");
    // Remove all of the drag data
    var dt = ev.dataTransfer;

    if (dt.items)
      // Use DataTransferItemList interface to remove the drag data
      for (var i = 0; i < dt.items.length; i++) {
        dt.items.remove(i);
      }

    else
      // Use DataTransfer interface to remove the drag data
      ev.dataTransfer.clearData();

  }
  /*drag and drop file*/

});


},{}]},{},[1]);
