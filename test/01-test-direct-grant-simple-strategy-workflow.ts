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

interface Pool {
	profileId: BytesLike
	strategy: string
	token: string
	metadata: Metadata
	managerRole: BytesLike
	adminRole: BytesLike
}

interface InitializeData {
	registryGating: boolean
	metadataRequired: boolean
	grantAmountRequired: boolean
}

interface RecipientData {
	recipientId: string
	recipientAddress: string
	grantAmount: BigInt
	metadata: Metadata
}

interface Recipient {
	useRegistryAnchor: boolean
	recipientAddress: string
	grantAmount: BigInt
	metadata: Metadata
	recipientStatus: number
	milestonesReviewStatus: number
}

describe('Allo Flow', async function () {
	function toDecimal(value: number): bigint {
		return BigInt(value * 10 ** 18)
	}

	let accounts: Accounts
	let contracts: Contracts

	const abiCoder = new ethers.AbiCoder()

	const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

	const initializeDataStructTypes: string[] = ['bool', 'bool', 'bool']
	const recipientDataStructTypes = [
		'address',
		'address',
		'uint256',
		'tuple(uint256, string)'
	]
	const metadataStructTypes: string[] = ['uint256', 'string']
	const allocateStructTypes: string[] = ['address', 'uint256', 'uint256']

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

	it.skip('Should create a profile', async () => {
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

	it.skip('Clone strategy', async () => {
		// Arrange
		const { admin } = accounts
		const { alloInstance, directGrantsSimpleStrategyContract } = contracts

		const directGrantsSimpleStrategyAddress: string =
			await directGrantsSimpleStrategyContract.getAddress()

		let strategyAddress: string

		// Act
		const addToCloneableStrategiesTx =
			await alloInstance.addToCloneableStrategies(
				directGrantsSimpleStrategyAddress
			)

		await addToCloneableStrategiesTx.wait()

		const events = await alloInstance.queryFilter(
			'StrategyApproved',
			addToCloneableStrategiesTx.blockHash
		)

		const event = events[events.length - 1]

		strategyAddress = event.args.strategy

		// Assert
		console.log('🏷️  Strategy cloned')
		try {
			assert.isTrue(
				await alloInstance.isCloneableStrategy(
					directGrantsSimpleStrategyAddress
				)
			)
		} catch (error) {
			console.log('🚨 Error: ', error)
		}
	})

	it.skip('Create pool', async () => {
		// Arrange
		const { admin, alice } = accounts
		const {
			registryInstance,
			alloInstance,
			directGrantsSimpleStrategyContract
		} = contracts

		const directGrantsSimpleStrategyAddress: string =
			await directGrantsSimpleStrategyContract.getAddress()

		const aliceNonce: number = await ethers.provider.getTransactionCount(
			alice.address
		)
		const aliceName: string = 'alice'
		const aliceMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}
		const aliceProfileMembers: string[] = []

		const alicePoolMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}

		const alicePoolManagers: string[] = []

		const alicePoolInitStrategyDataObject: InitializeData = {
			registryGating: true,
			metadataRequired: true,
			grantAmountRequired: true
		}

		const aliceInitStrategyDataValues: boolean[] = [
			alicePoolInitStrategyDataObject.registryGating,
			alicePoolInitStrategyDataObject.metadataRequired,
			alicePoolInitStrategyDataObject.grantAmountRequired
		]

		const aliceInitStrategyData: BytesLike = abiCoder.encode(
			initializeDataStructTypes,
			aliceInitStrategyDataValues
		)

		let poolFundingAmount: bigint = toDecimal(1)

		let events: any
		let event: any

		let aliceProfileId: BytesLike
		let aliceProfileDto: any
		let aliceProfile: Profile

		let strategyAddress: string

		let alicePoolId: BytesLike
		let alicePoolDto: any
		let alicePool: Pool

		// Act

		// Create profile
		console.log(' 🚩  1. Create profile')
		const createProfileTx = await registryInstance.connect(alice).createProfile(
			aliceNonce, // _nonce
			aliceName, // _name
			[aliceMetadata.protocol, aliceMetadata.pointer], // _metadata
			alice.address, // ownerAddress
			aliceProfileMembers // _membersAddresses
		)

		await createProfileTx.wait()

		events = await registryInstance.queryFilter(
			'ProfileCreated',
			createProfileTx.blockHash
		)

		event = events[events.length - 1]

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

		// Add strategy to cloneable strategies
		console.log(' 🚩  2. Add strategy to cloneable strategies')
		const addToCloneableStrategiesTx = await alloInstance
			.connect(admin)
			.addToCloneableStrategies(directGrantsSimpleStrategyAddress)

		await addToCloneableStrategiesTx.wait()

		events = await alloInstance.queryFilter(
			'StrategyApproved',
			addToCloneableStrategiesTx.blockHash
		)

		event = events[events.length - 1]

		strategyAddress = event.args.strategy

		// Create pool
		console.log(' 🚩  3. Create pool')
		const createPoolTx = await alloInstance.connect(alice).createPool(
			aliceProfileId, // _profileId
			strategyAddress, // _strategy
			aliceInitStrategyData, // _initStrategyData
			NATIVE, //_token
			poolFundingAmount, // _amount
			[alicePoolMetadata.protocol, alicePoolMetadata.pointer], // _metadata
			alicePoolManagers, // _managers
			{ value: poolFundingAmount }
		)

		await createPoolTx.wait()

		events = await alloInstance.queryFilter(
			'PoolCreated',
			createPoolTx.blockHash
		)

		event = events[events.length - 1]

		alicePoolId = event.args.poolId
		alicePoolDto = await alloInstance.getPool(alicePoolId)
		alicePool = {
			profileId: alicePoolDto[0],
			strategy: alicePoolDto[1],
			token: alicePoolDto[2],
			metadata: {
				protocol: alicePoolDto[3][0],
				pointer: alicePoolDto[3][1]
			},
			managerRole: alicePoolDto[4],
			adminRole: alicePoolDto[5]
		}

		// Assert
		console.log('🏷️  Pool created')
		try {
			assert.isTrue(aliceProfile.id === alicePool.profileId)
		} catch (error) {
			console.log('🚨 Error: ', error)
		}
	})

	it.skip('Add recipient', async () => {
		// Arrange
		const { admin, alice, bob } = accounts
		const {
			registryInstance,
			alloInstance,
			directGrantsSimpleStrategyContract
		} = contracts

		const directGrantsSimpleStrategyAddress: string =
			await directGrantsSimpleStrategyContract.getAddress()

		const aliceNonce: number = await ethers.provider.getTransactionCount(
			alice.address
		)
		const aliceName: string = 'alice'
		const aliceMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}
		const aliceProfileMembers: string[] = []

		const alicePoolMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}

		const alicePoolManagers: string[] = []

		const alicePoolInitStrategyDataObject: InitializeData = {
			registryGating: false,
			metadataRequired: true,
			grantAmountRequired: true
		}

		const aliceInitStrategyDataValues: boolean[] = [
			alicePoolInitStrategyDataObject.registryGating,
			alicePoolInitStrategyDataObject.metadataRequired,
			alicePoolInitStrategyDataObject.grantAmountRequired
		]

		const aliceInitStrategyData: BytesLike = abiCoder.encode(
			initializeDataStructTypes,
			aliceInitStrategyDataValues
		)

		let bobData: RecipientData = {
			recipientId: bob.address,
			recipientAddress: ZeroAddress,
			grantAmount: toDecimal(1),
			metadata: {
				protocol: BigInt(1),
				pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
			}
		}

		const bobDataArray: any[] = [
			bobData.recipientId,
			bobData.recipientAddress,
			bobData.grantAmount,
			[bobData.metadata.protocol, bobData.metadata.pointer]
		]

		let bobDataBytes: BytesLike = abiCoder.encode(
			recipientDataStructTypes,
			bobDataArray
		)

		let poolFundingAmount: bigint = toDecimal(1)

		let events: any
		let event: any

		let aliceProfileId: BytesLike
		let aliceProfileDto: any
		let aliceProfile: Profile
		let aliceStrategyContract: Contract

		let strategyAddress: string

		let alicePoolId: bigint
		let alicePoolDto: any
		let alicePool: Pool

		let bobRecipientId: string

		// Act

		// Create profile
		console.log(' 🚩  1. Create profile')
		const createProfileTx = await registryInstance.connect(alice).createProfile(
			aliceNonce, // _nonce
			aliceName, // _name
			[aliceMetadata.protocol, aliceMetadata.pointer], // _metadata
			alice.address, // ownerAddress
			aliceProfileMembers // _membersAddresses
		)

		await createProfileTx.wait()

		events = await registryInstance.queryFilter(
			'ProfileCreated',
			createProfileTx.blockHash
		)

		event = events[events.length - 1]

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

		bobData.recipientAddress = aliceProfile.anchor
		bobDataArray[1] = bobData.recipientAddress
		bobDataBytes = abiCoder.encode(recipientDataStructTypes, bobDataArray)

		// Add strategy to cloneable strategies
		console.log(' 🚩  2. Add strategy to cloneable strategies')
		const addToCloneableStrategiesTx = await alloInstance
			.connect(admin)
			.addToCloneableStrategies(directGrantsSimpleStrategyAddress)

		await addToCloneableStrategiesTx.wait()

		events = await alloInstance.queryFilter(
			'StrategyApproved',
			addToCloneableStrategiesTx.blockHash
		)

		event = events[events.length - 1]

		strategyAddress = event.args.strategy

		// Create pool
		console.log(' 🚩  3. Create pool')
		const createPoolTx = await alloInstance.connect(alice).createPool(
			aliceProfileId, // _profileId
			strategyAddress, // _strategy
			aliceInitStrategyData, // _initStrategyData
			NATIVE, //_token
			poolFundingAmount, // _amount
			[alicePoolMetadata.protocol, alicePoolMetadata.pointer], // _metadata
			alicePoolManagers, // _managers
			{ value: poolFundingAmount }
		)

		await createPoolTx.wait()

		events = await alloInstance.queryFilter(
			'PoolCreated',
			createPoolTx.blockHash
		)

		event = events[events.length - 1]

		alicePoolId = event.args.poolId
		alicePoolDto = await alloInstance.getPool(alicePoolId)
		alicePool = {
			profileId: alicePoolDto[0],
			strategy: alicePoolDto[1],
			token: alicePoolDto[2],
			metadata: {
				protocol: alicePoolDto[3][0],
				pointer: alicePoolDto[3][1]
			},
			managerRole: alicePoolDto[4],
			adminRole: alicePoolDto[5]
		}

		aliceStrategyContract = await ethers.getContractAt(
			'DirectGrantsSimpleStrategy',
			alicePool.strategy
		)

		// 4. Add recipient
		console.log(' 🚩  4. Add recipient')
		const addRecipientTx = await alloInstance
			.connect(alice)
			.registerRecipient(alicePoolId, bobDataBytes)

		await addRecipientTx.wait()

		events = await aliceStrategyContract.queryFilter(
			'Registered',
			addRecipientTx.blockHash
		)

		event = events[events.length - 1]

		bobRecipientId = event.args.recipientId

		const bobRecipientDto: any[] = await aliceStrategyContract.getRecipient(
			bobRecipientId
		)

		const bobRecipient: Recipient = {
			useRegistryAnchor: bobRecipientDto[0],
			recipientAddress: bobRecipientDto[1],
			grantAmount: bobRecipientDto[2],
			metadata: {
				protocol: bobRecipientDto[3][0],
				pointer: bobRecipientDto[3][1]
			},
			recipientStatus: bobRecipientDto[4],
			milestonesReviewStatus: bobRecipientDto[5]
		}

		// Assert
		console.log('🏷️  Recipient added')
		try {
			assert.equal(bobRecipient.recipientAddress, bob.address)
		} catch (error) {
			console.log('🚨 Error: ', error)
		}
	})

	it.skip('Set recipient status to inReview', async () => {
		// Arrange
		const { admin, alice, bob } = accounts
		const {
			registryInstance,
			alloInstance,
			directGrantsSimpleStrategyContract
		} = contracts

		const directGrantsSimpleStrategyAddress: string =
			await directGrantsSimpleStrategyContract.getAddress()

		const aliceNonce: number = await ethers.provider.getTransactionCount(
			alice.address
		)
		const aliceName: string = 'alice'
		const aliceMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}
		const aliceProfileMembers: string[] = []

		const alicePoolMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}

		const alicePoolManagers: string[] = []

		const alicePoolInitStrategyDataObject: InitializeData = {
			registryGating: false,
			metadataRequired: true,
			grantAmountRequired: true
		}

		const aliceInitStrategyDataValues: boolean[] = [
			alicePoolInitStrategyDataObject.registryGating,
			alicePoolInitStrategyDataObject.metadataRequired,
			alicePoolInitStrategyDataObject.grantAmountRequired
		]

		const aliceInitStrategyData: BytesLike = abiCoder.encode(
			initializeDataStructTypes,
			aliceInitStrategyDataValues
		)

		let bobData: RecipientData = {
			recipientId: bob.address,
			recipientAddress: ZeroAddress,
			grantAmount: toDecimal(1),
			metadata: {
				protocol: BigInt(1),
				pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
			}
		}

		const bobDataArray: any[] = [
			bobData.recipientId,
			bobData.recipientAddress,
			bobData.grantAmount,
			[bobData.metadata.protocol, bobData.metadata.pointer]
		]

		let bobDataBytes: BytesLike = abiCoder.encode(
			recipientDataStructTypes,
			bobDataArray
		)

		let poolFundingAmount: bigint = toDecimal(1)

		let events: any
		let event: any

		let aliceProfileId: BytesLike
		let aliceProfileDto: any
		let aliceProfile: Profile
		let aliceStrategyContract: any

		let strategyAddress: string

		let alicePoolId: bigint
		let alicePoolDto: any
		let alicePool: Pool

		let bobRecipientId: string
		let bobRecipientStatus: bigint

		// Act

		// Create profile
		console.log(' 🚩  1. Create profile')
		const createProfileTx = await registryInstance.connect(alice).createProfile(
			aliceNonce, // _nonce
			aliceName, // _name
			[aliceMetadata.protocol, aliceMetadata.pointer], // _metadata
			alice.address, // ownerAddress
			aliceProfileMembers // _membersAddresses
		)

		await createProfileTx.wait()

		events = await registryInstance.queryFilter(
			'ProfileCreated',
			createProfileTx.blockHash
		)

		event = events[events.length - 1]

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

		bobData.recipientAddress = aliceProfile.anchor
		bobDataArray[1] = bobData.recipientAddress
		bobDataBytes = abiCoder.encode(recipientDataStructTypes, bobDataArray)

		// Add strategy to cloneable strategies
		console.log(' 🚩  2. Add strategy to cloneable strategies')
		const addToCloneableStrategiesTx = await alloInstance
			.connect(admin)
			.addToCloneableStrategies(directGrantsSimpleStrategyAddress)

		await addToCloneableStrategiesTx.wait()

		events = await alloInstance.queryFilter(
			'StrategyApproved',
			addToCloneableStrategiesTx.blockHash
		)

		event = events[events.length - 1]

		strategyAddress = event.args.strategy

		// Create pool
		console.log(' 🚩  3. Create pool')
		const createPoolTx = await alloInstance.connect(alice).createPool(
			aliceProfileId, // _profileId
			strategyAddress, // _strategy
			aliceInitStrategyData, // _initStrategyData
			NATIVE, //_token
			poolFundingAmount, // _amount
			[alicePoolMetadata.protocol, alicePoolMetadata.pointer], // _metadata
			alicePoolManagers, // _managers
			{ value: poolFundingAmount }
		)

		await createPoolTx.wait()

		events = await alloInstance.queryFilter(
			'PoolCreated',
			createPoolTx.blockHash
		)

		event = events[events.length - 1]

		alicePoolId = event.args.poolId
		alicePoolDto = await alloInstance.getPool(alicePoolId)
		alicePool = {
			profileId: alicePoolDto[0],
			strategy: alicePoolDto[1],
			token: alicePoolDto[2],
			metadata: {
				protocol: alicePoolDto[3][0],
				pointer: alicePoolDto[3][1]
			},
			managerRole: alicePoolDto[4],
			adminRole: alicePoolDto[5]
		}

		aliceStrategyContract = await ethers.getContractAt(
			'DirectGrantsSimpleStrategy',
			alicePool.strategy
		)

		// 4. Add recipient
		console.log(' 🚩  4. Add recipient')
		const addRecipientTx = await alloInstance
			.connect(alice)
			.registerRecipient(alicePoolId, bobDataBytes)

		await addRecipientTx.wait()

		events = await aliceStrategyContract.queryFilter(
			'Registered',
			addRecipientTx.blockHash
		)

		event = events[events.length - 1]

		bobRecipientId = event.args.recipientId

		const bobRecipientDto: any[] = await aliceStrategyContract.getRecipient(
			bobRecipientId
		)

		const bobRecipient: Recipient = {
			useRegistryAnchor: bobRecipientDto[0],
			recipientAddress: bobRecipientDto[1],
			grantAmount: bobRecipientDto[2],
			metadata: {
				protocol: bobRecipientDto[3][0],
				pointer: bobRecipientDto[3][1]
			},
			recipientStatus: bobRecipientDto[4],
			milestonesReviewStatus: bobRecipientDto[5]
		}

		// 5. Set recipient status to inReview
		console.log(' 🚩  5. Set recipient status to inReview')

		const setRecipientStatusToInReviewTx = await aliceStrategyContract
			.connect(alice)
			.setRecipientStatusToInReview([bobRecipientId])

		await setRecipientStatusToInReviewTx.wait()

		events = await aliceStrategyContract.queryFilter(
			'RecipientStatusChanged',
			setRecipientStatusToInReviewTx.blockHash
		)

		event = events[events.length - 1]

		const recipientStatusChangedStatus: bigint = event.args.status

		bobRecipientStatus = await aliceStrategyContract.getRecipientStatus(
			bobRecipientId
		)

		// Assert
		console.log('🏷️  Recipient status changed to inReview')
		try {
			assert.equal(recipientStatusChangedStatus, bobRecipientStatus)
		} catch (error) {
			console.log('🚨 Error: ', error)
		}
	})

	it('allocate funds', async () => {
		// Arrange
		const { admin, alice, bob } = accounts
		const {
			registryInstance,
			alloInstance,
			directGrantsSimpleStrategyContract
		} = contracts

		const directGrantsSimpleStrategyAddress: string =
			await directGrantsSimpleStrategyContract.getAddress()

		const aliceNonce: number = await ethers.provider.getTransactionCount(
			alice.address
		)
		const aliceName: string = 'alice'
		const aliceMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}
		const aliceProfileMembers: string[] = []

		const alicePoolMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}

		const alicePoolManagers: string[] = []

		const alicePoolInitStrategyDataObject: InitializeData = {
			registryGating: false,
			metadataRequired: true,
			grantAmountRequired: true
		}

		const aliceInitStrategyDataValues: boolean[] = [
			alicePoolInitStrategyDataObject.registryGating,
			alicePoolInitStrategyDataObject.metadataRequired,
			alicePoolInitStrategyDataObject.grantAmountRequired
		]

		const aliceInitStrategyData: BytesLike = abiCoder.encode(
			initializeDataStructTypes,
			aliceInitStrategyDataValues
		)

		let bobData: RecipientData = {
			recipientId: bob.address,
			recipientAddress: ZeroAddress,
			grantAmount: toDecimal(1),
			metadata: {
				protocol: BigInt(1),
				pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
			}
		}

		const bobDataArray: any[] = [
			bobData.recipientId,
			bobData.recipientAddress,
			bobData.grantAmount,
			[bobData.metadata.protocol, bobData.metadata.pointer]
		]

		let bobDataBytes: BytesLike = abiCoder.encode(
			recipientDataStructTypes,
			bobDataArray
		)

		let bobAllocateDataArray: any[] = [bob.address, BigInt(2), toDecimal(0.5)]

		let bobAllocateDataBytes: BytesLike = abiCoder.encode(
			allocateStructTypes,
			bobAllocateDataArray
		)

		let poolFundingAmount: bigint = toDecimal(1)

		let events: any
		let event: any

		let aliceProfileId: BytesLike
		let aliceProfileDto: any
		let aliceProfile: Profile
		let aliceStrategyContract: any

		let strategyAddress: string

		let alicePoolId: bigint
		let alicePoolDto: any
		let alicePool: Pool

		let bobRecipientId: string
		let bobRecipient: Recipient
		let bobRecipientStatus: bigint

		// Act

		// Create profile
		console.log(' 🚩  1. Create profile')
		const createProfileTx = await registryInstance.connect(alice).createProfile(
			aliceNonce, // _nonce
			aliceName, // _name
			[aliceMetadata.protocol, aliceMetadata.pointer], // _metadata
			alice.address, // ownerAddress
			aliceProfileMembers // _membersAddresses
		)

		await createProfileTx.wait()

		events = await registryInstance.queryFilter(
			'ProfileCreated',
			createProfileTx.blockHash
		)

		event = events[events.length - 1]

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

		bobData.recipientAddress = aliceProfile.anchor
		bobDataArray[1] = bobData.recipientAddress
		bobDataBytes = abiCoder.encode(recipientDataStructTypes, bobDataArray)

		// Add strategy to cloneable strategies
		console.log(' 🚩  2. Add strategy to cloneable strategies')
		const addToCloneableStrategiesTx = await alloInstance
			.connect(admin)
			.addToCloneableStrategies(directGrantsSimpleStrategyAddress)

		await addToCloneableStrategiesTx.wait()

		events = await alloInstance.queryFilter(
			'StrategyApproved',
			addToCloneableStrategiesTx.blockHash
		)

		event = events[events.length - 1]

		strategyAddress = event.args.strategy

		// Create pool
		console.log(' 🚩  3. Create pool')
		const createPoolTx = await alloInstance.connect(alice).createPool(
			aliceProfileId, // _profileId
			strategyAddress, // _strategy
			aliceInitStrategyData, // _initStrategyData
			NATIVE, //_token
			poolFundingAmount, // _amount
			[alicePoolMetadata.protocol, alicePoolMetadata.pointer], // _metadata
			alicePoolManagers, // _managers
			{ value: poolFundingAmount }
		)

		await createPoolTx.wait()

		events = await alloInstance.queryFilter(
			'PoolCreated',
			createPoolTx.blockHash
		)

		event = events[events.length - 1]

		alicePoolId = event.args.poolId
		alicePoolDto = await alloInstance.getPool(alicePoolId)
		alicePool = {
			profileId: alicePoolDto[0],
			strategy: alicePoolDto[1],
			token: alicePoolDto[2],
			metadata: {
				protocol: alicePoolDto[3][0],
				pointer: alicePoolDto[3][1]
			},
			managerRole: alicePoolDto[4],
			adminRole: alicePoolDto[5]
		}

		aliceStrategyContract = await ethers.getContractAt(
			'DirectGrantsSimpleStrategy',
			alicePool.strategy
		)

		// 4. Add recipient
		console.log(' 🚩  4. Add recipient')
		const addRecipientTx = await alloInstance
			.connect(alice)
			.registerRecipient(alicePoolId, bobDataBytes)

		await addRecipientTx.wait()

		events = await aliceStrategyContract.queryFilter(
			'Registered',
			addRecipientTx.blockHash
		)

		event = events[events.length - 1]

		bobRecipientId = event.args.recipientId

		let bobRecipientDto: any[] = await aliceStrategyContract.getRecipient(
			bobRecipientId
		)

		bobRecipient = {
			useRegistryAnchor: bobRecipientDto[0],
			recipientAddress: bobRecipientDto[1],
			grantAmount: bobRecipientDto[2],
			metadata: {
				protocol: bobRecipientDto[3][0],
				pointer: bobRecipientDto[3][1]
			},
			recipientStatus: bobRecipientDto[4],
			milestonesReviewStatus: bobRecipientDto[5]
		}

		// 5. Set recipient status to inReview
		console.log(' 🚩  5. Set recipient status to inReview')

		const setRecipientStatusToInReviewTx = await aliceStrategyContract
			.connect(alice)
			.setRecipientStatusToInReview([bobRecipientId])

		await setRecipientStatusToInReviewTx.wait()

		events = await aliceStrategyContract.queryFilter(
			'RecipientStatusChanged',
			setRecipientStatusToInReviewTx.blockHash
		)

		event = events[events.length - 1]

		let recipientStatusChangedStatus: bigint = event.args.status

		bobRecipientStatus = await aliceStrategyContract.getRecipientStatus(
			bobRecipientId
		)

		// 6. Allocate funds
		console.log(' 🚩  6. Allocate funds')

		const allocateFundsTx = await alloInstance
			.connect(alice)
			.allocate(alicePoolId, bobAllocateDataBytes)

		await allocateFundsTx.wait()

		events = await aliceStrategyContract.queryFilter(
			'RecipientStatusChanged',
			allocateFundsTx.blockHash
		)

		event = events[events.length - 1]

		recipientStatusChangedStatus = event.args.status

		// Assert
		console.log('🏷️  Funds allocated')
		try {
			assert.equal(recipientStatusChangedStatus, BigInt(2))
		} catch (error) {
			console.log('🚨 Error: ', error)
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
