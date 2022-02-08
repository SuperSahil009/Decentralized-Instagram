import React, { Component } from 'react';
import Web3 from 'web3';
import Identicon from 'identicon.js';
import './App.css';
import Decentragram from '../abis/Decentragram.json'
import Navbar from './Navbar'
import Main from './Main'

const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({
  host: 'ipfs.infura.io',
  port: 5001,
  protocol: 'https'
})

class App extends Component {

  async componentWillMount(){
    await this.loadWeb3();
    await this.loadBlockchainData();
  }


  async loadWeb3() {
    if (window.ethereum) {
      window.web3 = new Web3(window.ethereum)
      await window.ethereum.enable()
    }
    else if (window.web3) {
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {
      window.alert('Non-Ethereum browser detected. You should consider trying MetaMask!')
    }
  }

  async loadBlockchainData(){
    const web3 = window.web3
    const accounts = await web3.eth.getAccounts()
    console.log(accounts)
    this.setState({account: accounts[0]})

    // Network ID
    const networkId = await web3.eth.net.getId()
    // returns 5777 on Ganache and "3" (chain ID) on ropsten, when deployed on internet
    const networkData = Decentragram.networks[networkId]
    if(networkData){
      const decentragram = web3.eth.Contract(Decentragram.abi , networkData.address)
      // instantiate the contract
      this.setState({decentragram})
      const imagesCount = await decentragram.methods.imageCount().call()
      this.setState({imagesCount})
      // Load images
      for(var i =1; i<= imagesCount; i++){
        const image = await decentragram.methods.images(i).call()
        this.setState({
          images: [...this.state.images,image]
        })
      }
      // sort the images
      this.setState({
        images: this.state.images.sort((a,b)=> b.tipAmount - a.tipAmount)
      })
      this.setState({loading: false})
    }
    else{
      window.alert("Decentragram SC not detected, please connect to Ropsten and have some ETH")
    }
    
  }

  captureFile = event => {
    event.preventDefault()
    const file = event.target.files[0]
    const reader = new window.FileReader()
    reader.readAsArrayBuffer(file)

    reader.onloadend = () => {
      this.setState({buffer: Buffer(reader.result)})
      console.log('buffer', this.state.buffer)
    }

  }

  uploadImage = description => {
    console.log("Submitting file to ipfs...")
    ipfs.add(this.state.buffer, (error, result)=>{
      console.log('IPFS result = ', result)
      if(error){
        console.error(error)
        return
      }
      this.setState({loading: true})
      this.state.decentragram.methods.uploadImage(result[0].hash, description).send({from: this.state.account}).on('transactionHash', (hash)=>{
        this.setState({loading: false})
      })
    })
  }

  tipImageOwner = (id, tipAmount) => {
    this.setState({loading: true})
    this.state.decentragram.methods.tipImageOwner(id).send({from: this.state.account, value: tipAmount}).on('transactionHash', (hash)=>{
      this.setState({loading: false})
    })
  }

  constructor(props) {
    super(props)
    this.state = {
      account: '',
      decentragram: null,
      images: [],
      loading: true
    }
  }

  render() {
    return (
      <div>
        <Navbar account={this.state.account} />
        { this.state.loading
          ? <div id="loader" className="text-center mt-5"><p>Loading...</p></div>
          : <Main
            images = {this.state.images}
            captureFile = {this.captureFile}
            uploadImage = {this.uploadImage}
            tipImageOwner = {this.tipImageOwner}
            />
          }
        }
      </div>
    );
  }
}


export default App;