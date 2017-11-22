let socket = io();

////////////////////////
socket.on('sendMsgTo',function(fromUsername, msgComming){
  
  if(!(cryptoApp.allMsg[fromUsername])) 
    cryptoApp.allMsg[fromUsername] = [];
  
  cryptoApp.currentSelectedUser = fromUsername;
  
  //decryption //receive a msg
  cryptoApp.allMsg[fromUsername].push({msg:msgComming, state:'in'});

});

///////////////////////
socket.on('newUsername',function(username, publicKeyED_buffer, publicKeySV_buffer){
    addOnlinePerson(username, publicKeyED_buffer, publicKeySV_buffer);
});
///////////////////////

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

      <div class="person" v-for="i in peopleArray" :key="i.id">
          <h3>{{i.name}}</h3>
          <span>is typing...</span>
      </div>

  </div>
  `,
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
    ivNow:'',

    //public + private key to encrypt / decrypt
    publicKeyED: '',
    privateKeyED: '',
    
    //public + private key to sign / verify    
    publicKeySV: '',
    privateKeySV: '',
    
    //session key by AES
    sessionKey: '',

    //current selected user to send msg to
    currentSelectedUser: '',

    //only for names
    peopleArray:[
    ],
    
    //to store personal infos
    allPeople:{
    },

    username:'',

    currentMsgArray:[
      {msg:'how are you?',state:'out'}
    ],
    currentMsgArrayEnc:[

    ],
    
    //this msgs objects working according to the username
    allMsg:{},
    allMsgEnc:{},

    realTimeMsg:'',

  },

  template:`
  <div id='cryptoApp'>
    <div class="line"></div>
    <online :peopleArray='peopleArray' :username='username'></online>
   
    <div class="col-2-3">
      <chatBox :publicMsg="currentMsgArray" v-model="realTimeMsg" v-on:sendMsg="sendMsg"></chatBox>
      <chatBoxEnc :publicMsgEnc="currentMsgArrayEnc"></chatBoxEnc>
      <fileArea></fileArea>
    </div>
  </div>
  `,


  methods:{
    sendMsg: function(){

      if(!(cryptoApp.currentSelectedUser)) return;

      console.log('send button clicked!!')
      
      if(!(cryptoApp.allMsg[cryptoApp.currentSelectedUser]))
        cryptoApp.allMsg[cryptoApp.currentSelectedUser] = [];

      cryptoApp.allMsg[cryptoApp.currentSelectedUser].push({msg: this.realTimeMsg, state:'out'});

      //send msg
      socket.emit('sendMsgTo',cryptoApp.username, cryptoApp.currentSelectedUser, this.realTimeMsg)


      cryptoApp.realTimeMsg="";

    },//sendMsg
  },


  watch:{
    
    currentMsgArray: function(){

      setTimeout(function () {
        let a = document.querySelectorAll('.msgArea')[0];
        a.scrollTop = a.scrollHeight;

        let b = document.querySelectorAll('.msgArea')[1];
        b.scrollTop = b.scrollHeight;
      }, 0);

    },
    
    currentMsgArrayEnc: function(){

      setTimeout(function () {
        let a = document.querySelectorAll('.msgArea')[0];
        a.scrollTop = a.scrollHeight;

        let b = document.querySelectorAll('.msgArea')[1];
        b.scrollTop = b.scrollHeight;
      }, 0);

    }

  }//watch

})



//io
//////////////////////////
function addOnlinePerson(personName, publicKeyED_buffer, publicKeySV_buffer){

  let newId = cryptoApp.peopleArray.length;

  let newPerson = {
    id: newId,
    name: personName
  };

  cryptoApp.peopleArray.push(newPerson);

  //add personal info and keys
  cryptoApp.allPeople[personName] = {
    publicKeyED: publicKeyED_buffer,
    publicKeySV: publicKeySV_buffer,
  };

}
//////////////////////////////


$(document).ready(function(){

  //change current selected user
  $('.people').click(function(event){

    cryptoApp.currentSelectedUser = $(event.target).text();

    if(!(cryptoApp.allMsg[cryptoApp.currentSelectedUser])) 
      cryptoApp.allMsg[cryptoApp.currentSelectedUser]=[];

    if(!(cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser])) 
      cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser]=[];
    
    cryptoApp.currentMsgArray = cryptoApp.allMsg[cryptoApp.currentSelectedUser];
    cryptoApp.currentMsgArrayEnc = cryptoApp.allMsgEnc[cryptoApp.currentSelectedUser];
  
  })

})