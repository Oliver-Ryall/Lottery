const { assert } = require('chai')
const truffleAssert = require('truffle-assertions')

contract('Lottery', accounts => {
    const Lottery = artifacts.require('Lottery')
    const VRFCoordinatorMock = artifacts.require('VRFCoordinatorMock')
    const MockPriceFeed = artifacts.require('MockV3Aggregator')
    const { LinkToken } = require('@chainlink/contracts/truffle/v0.4/LinkToken')

    const defaultAccount = accounts[0]
    const player1 = accounts[1]
    const player2 = accounts[2]
    const player3 = accounts[3]

    let lottery, vrfCoordinatorMock, link, keyhash, fee, mockPriceFeed, entryFee

    describe('#requests a random number', () => {
        let price = '200000000000' //2000 usd
        beforeEach(async () => {
            keyhash = '0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4'
            fee = '100000000000000000' // 0.1
            entryFee = 50
            link = await LinkToken.new({ from: defaultAccount })
            mockPriceFeed = await MockPriceFeed.new(8, price, { from: defaultAccount })
            vrfCoordinatorMock = await VRFCoordinatorMock.new(link.address, { from: defaultAccount })
            lottery = await Lottery.new(
                mockPriceFeed.address,
                entryFee,
                vrfCoordinatorMock.address,
                link.address,
                keyhash,
                { from: defaultAccount }
            )
        })
        it('starts in closed state', async () => {
            assert(await lottery.state() == 2)
        })

        it('correctly gets entrance fee', async () => {
            entranceFee = await lottery.getEntranceFee()
            assert.equal(entranceFee.toString(), '3525163520000000')
        })

        it('Reverts because user does not have enough money to enter', async() => {
            await lottery.startLottery({from: defaultAccount})
            assert(truffleAssert.reverts(lottery.enter({from: defaultAccount})))
        })

        it('Plays the lottery correctly', async() => {
            await lottery.startLottery({from: defaultAccount})
            lottery.enter({from: player1, value: entranceFee.toString()})
            lottery.enter({from: player2, value: entranceFee.toString()})
            lottery.enter({from: player3, value: entranceFee.toString()})
            await link.transfer(lottery.address, web3.utils.toWei('1', 'ether'), {from: defaultAccount})
            let transaction = await lottery.endLottery({from: defaultAccount})
            let requestId = transaction.receipt.rawLogs[3].topics[0]
            await vrfCoordinatorMock.callBackWithRandomness(requestId, '3', lottery.address, {from: defaultAccount})
            let recentWinner = lottery.recentWinner()
            assert(recentWinner, player1)
        })
    })
})