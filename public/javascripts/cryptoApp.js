

Vue.component('loginForm',{
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
    }
  }
})

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
      <span>Crypto-Type</span>
      <span>Algorithm</span>
      <span>Key size</span>

      <h3>{{cryptoType}}</h3>
      <h3>{{cryptoAlgo}}</h3>
      <h3>{{cryptoKeySize}}-bit</h3>
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

function fakeEnc(text){
  if(text == "") return "";
  return text + ' enc***';
}
function fakeDec(text){
  return "dec*** "+text;
}

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

      let yourTypedMsg = $('.inputArea input').val().trim();
      if(!yourTypedMsg) return;

      cryptoApp.publicMsg.push({msg:yourTypedMsg, state:'out'});
      cryptoApp.publicMsgEnc.push({msg:fakeEnc(yourTypedMsg), state:'out'});

      cryptoApp.realTimeMsg="";
    },

}
})

Vue.component('fileArea',{
  template:`
  <div class="fileArea">
  Drag files to here to send them...
  </div>
  `
})
let cryptoApp = new Vue({
  el:'#cryptoApp',
  data:{
    cryptoType:'Symmetric',
    cryptoAlgo:'AES',
    cryptoKeySize: '192',

    secretKey:'default key',

    peopleArray:[
      {id:0, name:'louay'},
      {id:1, name:'anas'},
      {id:2, name:'moied'},

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
      <chatBox :publicMsg="publicMsg" v-model="realTimeMsg"></chatBox>
      <chatBoxEnc :publicMsgEnc="publicMsgEnc" :realTimeEncMsg="realTimeEncMsg"></chatBoxEnc>
      <fileArea></fileArea>
    </div>
  </div>
  `,
  computed:{
    realTimeEncMsg:function(){
      return fakeEnc(this.realTimeMsg);
    }
  }
})


function addOnlinePerson(personName){

  let newId = cryptoApp.peopleArray.length;

  let newPerson = {
    id: newId,
    name: personName
  };

  cryptoApp.peopleArray.push(newPerson);
}

function removeOnlinePerson(personName){

  let tmp = [];

  while(cryptoApp.peopleArray[cryptoApp.peopleArray.length-1].name != personName)
    tmp.push(cryptoApp.peopleArray.pop());

  cryptoApp.peopleArray.pop();

  while(tmp.length)
    cryptoApp.peopleArray.push(tmp.pop());

}

function recvMsg(text){

  cryptoApp.publicMsgEnc.push({msg:text, state:'in'});
  cryptoApp.publicMsg.push({msg:fakeDec(text), state:'in'});

}


$(document).ready(function(){

  console.log('jQuery is running...');

})
