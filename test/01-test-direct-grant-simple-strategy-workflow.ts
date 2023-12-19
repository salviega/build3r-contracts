import { ethers, upgrades } from 'hardhat'
import { assert, expect } from 'chai'
import { moveTime } from '../utils/move-time'
import { BaseContract, Contract, ContractFactory, ZeroAddress } from 'ethers'
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

describe('Allo Flow', async function () {
	let accounts: Accounts
	let contracts: Contracts

	let numberProject: number
	let length: number = 0

	let users

	let allProjects
	let allProjectsByOngoing
	let allProjectByFailed
	let allProjectBySucceeded
	let allProjectByUser
	let allProjectByUserOngoing
	let allProjectByUserFailed
	let allProjectByUserSucceeded

	let allProjectsLength
	let allProjectsByOngoingLength
	let allProjectByFailedLength
	let allProjectBySucceededLength
	let allProjectByUserLength
	let allProjectByUserOngoingLength
	let allProjectByUserFailedLength
	let allProjectByUserSucceededLength

	let amount = ethers.parseEther('10')

	let planning = new Date('2023-11-28T12:00:00Z')
	let planningTimestamp = Math.floor(planning.getTime() / 1000)

	let projectTimeStart = new Date('2023-11-29T12:00:00Z')
	let projectTimeStartTimestamp = Math.floor(projectTimeStart.getTime() / 1000)

	let projectTimeEnd = new Date('2023-11-30T12:00:00Z')
	let projectTimeEndTimestamp = Math.floor(projectTimeEnd.getTime() / 1000)

	let projectTime = [projectTimeStartTimestamp, projectTimeEndTimestamp]

	let info = 'info'

	let createProjectArgs: any = [amount, planningTimestamp, projectTime, info]

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

		const { admin } = accounts
		const {
			registryInstance,
			alloInstance,
			directGrantsSimpleStrategyContract
		} = contracts
	})

	it.skip('Should get projects emptly', async () => {
		// Arrange
		const { user1 } = accounts
		const { natureLink } = contracts

		numberProject = 0

		allProjects = await natureLink.getAllProjects()
		allProjectsByOngoing = await natureLink.getAllProjectsByStatus(0)
		allProjectByFailed = await natureLink.getAllProjectsByStatus(1)
		allProjectBySucceeded = await natureLink.getAllProjectsByStatus(2)
		allProjectByUser = await natureLink.getAllProjectsByUser(user1.address)
		allProjectByUserOngoing = await natureLink.getAllProjectsByUserStatus(
			user1.address,
			0
		)
		allProjectByUserFailed = await natureLink.getAllProjectsByUserStatus(
			user1.address,
			1
		)
		allProjectByUserSucceeded = await natureLink.getAllProjectsByUserStatus(
			user1.address,
			2
		)

		// Act
		allProjectsLength = allProjects.length
		allProjectsByOngoingLength = allProjectsByOngoing.length
		allProjectByFailedLength = allProjectByFailed.length
		allProjectBySucceededLength = allProjectBySucceeded.length
		allProjectByUserLength = allProjectByUser.length
		allProjectByUserOngoingLength = allProjectByUserOngoing.length
		allProjectByUserFailedLength = allProjectByUserFailed.length
		allProjectByUserSucceededLength = allProjectByUserSucceeded.length

		// Assert
		console.log('\n')
		console.log('🏷️  There should be no projects')

		try {
			assert.equal(allProjectsLength, numberProject)
			console.log('✅ allProjectsLength should be 0')
		} catch (e) {
			console.log(
				'❌ allProjectsLength should be 0 but was ' + allProjectsLength
			)
		}

		try {
			assert.equal(allProjectsByOngoingLength, numberProject)
			console.log('✅ allProjectsByOngoingLength should be 0')
		} catch (e) {
			console.log(
				'❌ allProjectsByOngoingLength should be 0 but was ' +
					allProjectsByOngoingLength
			)
		}

		try {
			assert.equal(allProjectByFailedLength, numberProject)
			console.log('✅ allProjectByFailedLength should be 0')
		} catch (e) {
			console.log(
				'❌ allProjectByFailedLength should be 0 but was ' +
					allProjectByFailedLength
			)
		}

		try {
			assert.equal(allProjectBySucceededLength, numberProject)
			console.log('✅ allProjectBySucceededLength should be 0')
		} catch (e) {
			console.log(
				'❌ allProjectBySucceededLength should be 0 but was ' +
					allProjectBySucceededLength
			)
		}

		try {
			assert.equal(allProjectByUserLength, numberProject)
			console.log('✅ allProjectByUserLength should be 0')
		} catch (e) {
			console.log(
				'❌ allProjectByUserLength should be 0 but was ' +
					allProjectByUserLength
			)
		}

		try {
			assert.equal(allProjectByUserOngoingLength, numberProject)
			console.log('✅ allProjectByUserOngoingLength should be 0')
		} catch (e) {
			console.log(
				'❌ allProjectByUserOngoingLength should be 0 but was ' +
					allProjectByUserOngoingLength
			)
		}

		try {
			assert.equal(allProjectByUserFailedLength, numberProject)
			console.log('✅ allProjectByUserFailedLength should be 0')
		} catch (e) {
			console.log(
				'❌ allProjectByUserFailedLength should be 0 but was ' +
					allProjectByUserFailedLength
			)
		}

		try {
			assert.equal(allProjectByUserSucceededLength, numberProject)
			console.log('✅ allProjectByUserSucceededLength should be 0')
		} catch (e) {
			console.log(
				'❌ allProjectByUserSucceededLength should be 0 but was ' +
					allProjectByUserSucceededLength
			)
		}

		try {
			await expect(
				natureLink.getProjectByUser(user1.address, numberProject)
			).to.be.revertedWith('getProjectByUser: User has no projects')
			console.log('✅ getProjectByUser should be reverted')
		} catch (e) {
			console.log('❌ getProjectByUser should be reverted but was ' + e)
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
