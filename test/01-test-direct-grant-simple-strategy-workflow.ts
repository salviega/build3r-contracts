import { ethers, upgrades } from 'hardhat'
import { assert, expect } from 'chai'
import { moveTime } from '../utils/move-time'
import {
	BaseContract,
	BytesLike,
	Contract,
	ContractFactory,
	ZeroAddress
} from 'ethers'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

interface Accounts {
	admin: SignerWithAddress
	alice: SignerWithAddress
	bob: SignerWithAddress
	kyle: SignerWithAddress
	carol: SignerWithAddress
}

interface Contracts {
	registryInstance: any
	alloInstance: any
	directGrantsSimpleStrategyContract: any
}

interface Metadata {
	protocol: BigInt
	pointer: string
}

interface Profile {
	id: string
	nonce: BigInt
	name: string
	metadata: Metadata
	owner: string
	anchor: string
}

describe('Allo Flow', async function () {
	let accounts: Accounts
	let contracts: Contracts

	beforeEach(async function () {
		const signers = await ethers.getSigners()

		accounts = {
			admin: signers[0],
			alice: signers[1],
			bob: signers[2],
			kyle: signers[3],
			carol: signers[4]
		}

		contracts = await deployContracts()
	})

	it('Should create a profile', async () => {
		// Arrange
		const { alice } = accounts
		const { registryInstance } = contracts

		const aliceNonce: number = await ethers.provider.getTransactionCount(
			alice.address
		)
		const aliceName: string = 'alice'
		const aliceMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}
		const aliceProfileMembers: string[] = []

		let aliceProfileId: BytesLike
		let aliceProfileDto: any
		let aliceProfile: Profile

		// Act
		const createProfileTx = await registryInstance.createProfile(
			aliceNonce, // _nonce
			aliceName, // _name
			[aliceMetadata.protocol, aliceMetadata.pointer], // _metadata
			alice.address, // ownerAddress
			aliceProfileMembers // _membersAddresses
		)

		await createProfileTx.wait()

		const events = await registryInstance.queryFilter(
			'ProfileCreated',
			createProfileTx.blockHash
		)

		const event = events[events.length - 1]

		aliceProfileId = event.args.profileId

		aliceProfileDto = await registryInstance.getProfileById(aliceProfileId)

		aliceProfile = {
			id: aliceProfileDto[0],
			nonce: aliceProfileDto[1],
			name: aliceProfileDto[2],
			metadata: {
				protocol: aliceProfileDto[3][0],
				pointer: aliceProfileDto[3][1]
			},
			owner: aliceProfileDto[4],
			anchor: aliceProfileDto[5]
		}
	})
})

async function deployContracts() {
	// Deploy Registry contract

	const registryArgs: any = [
		'0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266' // owner
	]
	const Registry: ContractFactory<any[], BaseContract> =
		await ethers.getContractFactory('Registry')

	const registryInstance: Contract = await upgrades.deployProxy(
		Registry,
		registryArgs
	)
	await registryInstance.waitForDeployment()

	const registryInstanceAddress: string = registryInstance.target as string

	// Deploy Allo contract

	const alloArgs: any = [
		'0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // owner
		registryInstanceAddress, // registryAddress
		'0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // treasury,
		0, // percentFee,
		0 // baseFee,
	]

	const Allo: ContractFactory<any[], BaseContract> =
		await ethers.getContractFactory('Allo')

	const alloInstance: Contract = await upgrades.deployProxy(Allo, alloArgs)
	await alloInstance.waitForDeployment()

	const alloInstanceAddress: string = alloInstance.target as string

	// Deploy Direct Grants Simple Strategy contract

	const directGrantsSimpleStrategyArgs: any[] = [
		alloInstanceAddress, // _alloAddress
		'direct grant simple strategy' // _strategyName
	]
	const directGrantsSimpleStrategyContract = await deployContract(
		'DirectGrantsSimpleStrategy',
		directGrantsSimpleStrategyArgs
	)

	// Return all deployed contracts
	return {
		registryInstance,
		alloInstance,
		directGrantsSimpleStrategyContract
	}
}

async function deployContract(contractName: string, args: any[]) {
	const ContractFactory: ContractFactory = await ethers.getContractFactory(
		contractName
	)
	const contract = await ContractFactory.deploy(...args)
	return contract
}
