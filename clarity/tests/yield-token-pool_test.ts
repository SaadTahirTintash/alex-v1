

import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

import { 
    YTPTestAgent1,
  } from './models/alex-tests-yield-token-pool.ts';

import { 
    MS_YTP_WBT_59760,
} from './models/alex-tests-multisigs.ts';

import { 
    USDAToken,
    WBTCToken,
    POOLTOKEN_YTP_WBTC_WBTC_59760
  } from './models/alex-tests-tokens.ts';


// Deployer Address Constants 
const wbtcAddress = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.token-wbtc"
const yieldwbtc59760Address = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.yield-wbtc-59760"
const ytpyieldwbtc59760Address = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.ytp-yield-wbtc-59760-wbtc"
const multisigytpyieldwbtc59760 = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.multisig-ytp-yield-wbtc-59760-wbtc"
const wrongPooltokenAddress = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.ytp-yield-usda-23040-usda"
const yieldwbtc80875Address = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.yield-wbtc-80875"
const ytpyieldwbtc80875Address = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.ytp-yield-wbtc-80875-wbtc"
const multisigytpyieldwbtc80875 = "ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.multisig-ytp-yield-wbtc-80875-wbtc"

const ONE_8 = 100000000
const expiry = 59760 * ONE_8

/**
 * Yield Token Pool Test Cases  
 * 
 */

Clarinet.test({
    name: "YTP : Pool creation, adding values and reducing values",

    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get("deployer")!;
        let YTPTest = new YTPTestAgent1(chain, deployer);

        //Deployer creating a pool, initial tokens injected to the pool
        let result = YTPTest.createPool(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, multisigytpyieldwbtc59760, 1000*ONE_8, 1000*ONE_8);
        result.expectOk().expectBool(true);

        // Check pool details and print
        let call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        let position:any = call.result.expectOk().expectTuple();
        position['balance-token'].expectUint(1000*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(1000*ONE_8);

        let listed = 100000000;

        //Add extra liquidity
        result = YTPTest.addToPosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 10*ONE_8);
        position = result.expectOk().expectTuple();
        position['supply'].expectUint(10*ONE_8);
        position['balance-token'].expectUint(10*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(10*ONE_8);

        // Check pool details and print
        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(1010*ONE_8);
        position['balance-token'].expectUint(1010*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(1010*ONE_8);        
        
        // Remove all liquidlity
        result = YTPTest.reducePosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, ONE_8);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(1010*ONE_8);
        position['dy'].expectUint(0);
        
        // Check pool details and print
        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(0);
        position['balance-token'].expectUint(0);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(0);          

        // Add back some liquidity
        result = YTPTest.addToPosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 1000*ONE_8);
        position = result.expectOk().expectTuple();
        position['supply'].expectUint(1000*ONE_8);
        position['balance-token'].expectUint(1000*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(1000*ONE_8);     
        
        // check t
        call = chain.callReadOnlyFn("yield-token-pool", "get-t", 
            [types.uint(expiry),
             types.uint(listed)
            ], deployer.address);
        call.result.expectOk().expectUint(710557)
        
        // zero actual yield-token, so must throw an error
        call = await YTPTest.getYgivenX(yieldwbtc59760Address, 1*ONE_8);
        call.result.expectErr().expectUint(2016)
        
        // zero actual yield-token, so yield must be zero
        call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        call.result.expectOk().expectUint(5)

        // zero rate environment, so yield-token and token are at parity.
        call = await YTPTest.getXgivenY(yieldwbtc59760Address, 2*ONE_8);
        call.result.expectOk().expectUint(199975237)

        // sell some yield-token
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 2*ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(199975237);
        position['dy'].expectUint(2*ONE_8);

        // yield-token now has "actual" balance
        call = chain.callReadOnlyFn("yield-token-pool", "get-pool-details", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        position = call.result.expectOk().expectTuple();
        position['balance-token'].expectUint(99800024763);
        position['balance-yield-token'].expectUint(2*ONE_8);
        position['balance-virtual'].expectUint(1000*ONE_8);         
            
        // now that yield token supply > token supply, yield is positive.
        call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        call.result.expectOk().expectUint(2847);

        // buy back some yield token
        result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, ONE_8, 0);
        position = result.expectOk().expectTuple()
        position['dx'].expectUint(ONE_8);
        position['dy'].expectUint(100028858);        

        // attempt to sell more than max allowed yield token (50% of pool) must throw an error
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 501*ONE_8, 0);
        position =result.expectErr().expectUint(4002)

        call = chain.callReadOnlyFn("yield-token-pool", "get-pool-details", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        position = call.result.expectOk().expectTuple();
        position['balance-token'].expectUint(99900024763);
        position['balance-yield-token'].expectUint(99971142);
        position['balance-virtual'].expectUint(1000*ONE_8); 

        // after buying back some yield token, yield decreases.
        call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        call.result.expectOk().expectUint(1426);

        // we sell close to maximum allowed of yield token
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 29*ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(2900524394);
        position['dy'].expectUint(29*ONE_8);                      

        // which moves yield substantially into the positive territory.
        call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        call.result.expectOk().expectUint(42661);   
        
        // simulate to be on half way to expiry
        chain.mineEmptyBlockUntil((expiry / ONE_8) / 2)      
        
        // check t == 0.5
        call = chain.callReadOnlyFn("yield-token-pool", "get-t", 
            [types.uint(expiry),
             types.uint(listed)
            ], deployer.address);
        call.result.expectOk().expectUint(355308)

        // about half way, so yield should halve, just like zero coupon bond gets closer to par
        call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        call.result.expectOk().expectUint(21334);
        
        // sell some (a lot of) yield-token
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 100*ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(10001386469);
        position['dy'].expectUint(100*ONE_8);       
            
        // and see how it pushes the yield pretty high
        call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        call.result.expectOk().expectUint(92959);   

        //buy back some yield token
        result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, 100*ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(100*ONE_8);
        position['dy'].expectUint(10005727560);

        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(100000000000);
        
        call = chain.callReadOnlyFn(ytpyieldwbtc59760Address, "get-balance", 
            [types.principal(deployer.address)
            ], deployer.address);
        call.result.expectOk().expectUint(100000000000);   

        // Remove some liquidlity
        result = YTPTest.reducePosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 0.5*ONE_8);
        position = result.expectOk().expectTuple();
        position['dx'].expectUint(48499056950);
        position['dy'].expectUint(1497121749);  
        
        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(50000000000);
        
        call = chain.callReadOnlyFn(ytpyieldwbtc59760Address, "get-balance", 
            [types.principal(deployer.address)
            ], deployer.address);
        call.result.expectOk().expectUint(50000000000);        

        // Add back some liquidity
        result = YTPTest.addToPosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 1000*ONE_8);
        position = result.expectOk().expectTuple();
        position['supply'].expectUint(103094788000);
        position['balance-token'].expectUint(1000*ONE_8);
        position['balance-yield-token'].expectUint(3086908988);
        position['balance-virtual'].expectUint(103094788085);    
        
        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(50000000000 + 103094788000);
        
        call = chain.callReadOnlyFn(ytpyieldwbtc59760Address, "get-balance", 
            [types.principal(deployer.address)
            ], deployer.address);
        call.result.expectOk().expectUint(50000000000 + 103094788000);

        // simulate to right before expiry
        chain.mineEmptyBlockUntil((expiry / ONE_8) - 1);  
        
        // confirm t is almost zero.
        call = chain.callReadOnlyFn("yield-token-pool", "get-t", 
            [types.uint(expiry),
             types.uint(listed)
            ], deployer.address);
        call.result.expectOk().expectUint(11)

        // nearly maturity, so yield should be close to zero.
        call = chain.callReadOnlyFn("yield-token-pool", "get-yield", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        call.result.expectOk().expectUint(5);    
        
        // buy some yield-token
        result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, 19*ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(19*ONE_8);
        position['dy'].expectUint(1900033901);

        // on expiry, the prices are back to parity.
        call = chain.callReadOnlyFn("yield-token-pool", "get-price", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        call.result.expectOk().expectUint(100000005); // par       
        
        // simulate to after expiry
        chain.mineEmptyBlockUntil((expiry / ONE_8) + 1);

        // on expiry, the prices are back to parity.
        call = chain.callReadOnlyFn("yield-token-pool", "get-price", 
            [types.principal(yieldwbtc59760Address)
            ], deployer.address);
        call.result.expectOk().expectUint(100000005); // par    
        
        // Check pool details and print
        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(153094788000);
        position['balance-token'].expectUint(150399056950);
        position['balance-yield-token'].expectUint(2683996920);
        position['balance-virtual'].expectUint(153094788043);          
        
        call = chain.callReadOnlyFn(ytpyieldwbtc59760Address, "get-balance", 
            [types.principal(deployer.address)
            ], deployer.address);
        call.result.expectOk().expectUint(153094788000);        

        // Remove all liquidlity
        result = YTPTest.reducePosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, ONE_8);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(150399056950);
        position['dy'].expectUint(2683996806);        

        // Check pool details and print
        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(0);
        position['balance-token'].expectUint(0);
        position['balance-yield-token'].expectUint(114);
        position['balance-virtual'].expectUint(0);    
    },    
});

Clarinet.test({
    name: "YTP : Trait check",

    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get("deployer")!;
        let wallet_1 = accounts.get("wallet_1")!;
        let YTPTest = new YTPTestAgent1(chain, deployer);

        //if non-deployer attempts to create a pool, throw an error.
        let result = YTPTest.createPool(wallet_1, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, multisigytpyieldwbtc59760, 1000*ONE_8, 1000*ONE_8);
        result.expectErr().expectUint(1000);

        //Deployer creating a pool, initial tokens injected to the pool
        result = YTPTest.createPool(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, multisigytpyieldwbtc59760, 1000*ONE_8, 1000*ONE_8);
        result.expectOk().expectBool(true);        

        //if wrong pool token is supplied, then throw an error
        result = YTPTest.addToPosition(deployer, yieldwbtc59760Address, wbtcAddress, wrongPooltokenAddress, 10*ONE_8);
        result.expectErr().expectUint(2023);

        // non-deployer can add liquidity
        result = YTPTest.addToPosition(wallet_1, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 10*ONE_8);
        result.expectOk();
        
        //if wrong pool token is supplied, throw an error
        result = YTPTest.reducePosition(deployer, yieldwbtc59760Address, wbtcAddress, wrongPooltokenAddress, ONE_8);
        result.expectErr().expectUint(2023);        
        
    }
})

Clarinet.test({
    name: "YTP : get-x-given-price/yield, get-y-given-price/yield",

    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get("deployer")!;
        let YTPTest = new YTPTestAgent1(chain, deployer);
        
        //Deployer creating a pool, initial tokens injected to the pool
        let result = YTPTest.createPool(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, multisigytpyieldwbtc59760, 1000*ONE_8, 1000*ONE_8);
        result.expectOk().expectBool(true);

        // Check pool details and print
        let call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        let position:any = call.result.expectOk().expectTuple();
        position['balance-token'].expectUint(1000*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(1000*ONE_8);

        call = await YTPTest.getYield(yieldwbtc59760Address);
        call.result.expectOk().expectUint(5);
        
        // if current yield < target yield, then supply of yield-token needs to increase
        call = await YTPTest.getXgivenYield(yieldwbtc59760Address, 0.001*ONE_8);
        call.result.expectErr().expectUint(2002);
        call = await YTPTest.getYgivenYield(yieldwbtc59760Address, 0.001*ONE_8);          
        call.result.expectOk().expectUint(7019668000);

        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 7019668000, 0);
        position = result.expectOk().expectTuple();
        position['dy'].expectUint(7019668000);
        position['dx'].expectUint(7023140005);

        call = await YTPTest.getYield(yieldwbtc59760Address);
        call.result.expectOk().expectUint(100006);

        // now let's try to reduce the yield
        call = await YTPTest.getYgivenYield(yieldwbtc59760Address, 0.0005*ONE_8);                  
        call.result.expectErr().expectUint(2002);
        call = await YTPTest.getXgivenYield(yieldwbtc59760Address, 0.0005*ONE_8);        
        call.result.expectOk().expectUint(3504368516);      
        
        result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, 3504368516, 0);
        position = result.expectOk().expectTuple();
        position['dy'].expectUint(3507017732);
        position['dx'].expectUint(3504368516);

        call = await YTPTest.getYield(yieldwbtc59760Address);
        call.result.expectOk().expectUint(50003);

    },    
});

Clarinet.test({
    name: "YTP : Fee Setting using Multisig ",

    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get("deployer")!;
        let wallet_2 = accounts.get("wallet_2")!;
        let contractOwner = accounts.get("deployer")!;
        let YTPTest = new YTPTestAgent1(chain, deployer);
        let MultiSigTest = new MS_YTP_WBT_59760(chain, deployer);
        let ytpPoolToken = new POOLTOKEN_YTP_WBTC_WBTC_59760(chain, deployer);
        let usdaToken = new USDAToken(chain, deployer);
        let wbtcToken = new WBTCToken(chain, deployer);
        const buffer = new ArrayBuffer(34)
        const feeRateX = 0.1*ONE_8; // 10%
        const feeRateY = 0.1*ONE_8;
        const feeRebate = 0.5*ONE_8;

        let money = usdaToken.transferToken(10*ONE_8,deployer.address,wallet_2.address, buffer);
        money = wbtcToken.transferToken(10*ONE_8,deployer.address,wallet_2.address, buffer);
        money.expectOk()

        //Deployer creating a pool, initial tokens injected to the pool
        let result = YTPTest.createPool(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, multisigytpyieldwbtc59760, 1000*ONE_8, 1000*ONE_8);
        result.expectOk().expectBool(true);

        // Check pool details and print
        let call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        let position:any = call.result.expectOk().expectTuple();
        position['balance-token'].expectUint(1000*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(1000*ONE_8);

        result = YTPTest.addToPosition(wallet_2, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 10*ONE_8);
        position = result.expectOk().expectTuple();
        position['supply'].expectUint(10*ONE_8);
        position['balance-token'].expectUint(10*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(10*ONE_8);   

        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(99972419);
        position['dy'].expectUint(ONE_8);

        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['balance-token'].expectUint(100900027581); // u99900045311
        position['balance-yield-token'].expectUint(ONE_8);
        position['balance-virtual'].expectUint(1010*ONE_8);

        call = await ytpPoolToken.balanceOf(deployer.address);
        call.result.expectOk().expectUint(100000000000);    // u100000000000

        call = await ytpPoolToken.balanceOf(wallet_2.address);
        call.result.expectOk().expectUint(1000000000);

        // Fee rate Setting Proposal of Multisig
        result = MultiSigTest.propose(1000, " Fee Rate Setting to 10%", " https://docs.alexgo.io", feeRateX, feeRateY)
        result.expectOk().expectUint(1) // First Proposal
    
        // Block 1000 mining
        chain.mineEmptyBlock(1000);

        // Deployer has 99 % of pool token
        let ROresult:any = ytpPoolToken.balanceOf(deployer.address);
        ROresult.result.expectOk().expectUint(100000000000);
        
        // Wallet_2 votes his 90% asset
        result = MultiSigTest.voteFor(wallet_2, ytpyieldwbtc59760Address, 1, 1000000000 * 9 / 10 )
        result.expectOk().expectUint(900000000)

        // 90 % of existing tokens are voted for the proposal
        result = MultiSigTest.voteFor(deployer, ytpyieldwbtc59760Address, 1, 100000000000 * 9 / 10 )
        result.expectOk().expectUint(90000000000)

        chain.mineEmptyBlock(1440);

        // end proposal 
        result = MultiSigTest.endProposal(1)
        result.expectOk().expectBool(true) // Success 
        
        // deployer (Contract owner) sets rebate rate
        result = YTPTest.setFeeRebate(contractOwner, yieldwbtc59760Address, feeRebate);
        result.expectOk().expectBool(true)

        // Fee checking
        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['balance-yield-token'].expectUint(100000000);
        position['balance-token'].expectUint(100900027581);
        position['balance-virtual'].expectUint(101000000000);
        position['fee-rate-yield-token'].expectUint(0.1*ONE_8);
        position['fee-rate-token'].expectUint(0.1*ONE_8);
        position['fee-rebate'].expectUint(0.5*ONE_8);
        
        call = await YTPTest.getYield(yieldwbtc59760Address);
        call.result.expectOk().expectUint(1355);

        // fee-yield = yield * fee-rate-token = 1355 * 0.1*ONE_8 = 135 (round-down) // (contract-call? .math-fixed-point mul-down 1335 u10000000)
        // lambda = ONE_8 - fee-yield = ONE_8 - 135 = 9999865 (non-floating point)
        // dy-net-fees = dy * lambda = 199999730    // (contract-call? .math-fixed-point mul-down u99999867 u200000000)
        // fee = dy - dy-net-fess = 200000000 - 199999730 = 270
        // fee-rebate = 270 * 0.5 = 135
        
        // sell some yield-token
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 2*ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(199967096);
        position['dy'].expectUint(199999730);

        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['balance-yield-token'].expectUint(100000000 + 199999730 + 135); //before + after + fee-rebate
        position['balance-token'].expectUint(100900027581 - 199967096);
        position['balance-virtual'].expectUint(101000000000);
    },    
});

Clarinet.test({
    name: "YTP : Error Test Cases ",

    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get("deployer")!;
        let wallet_2 = accounts.get("wallet_2")!;
        let YTPTest = new YTPTestAgent1(chain, deployer);
        let MultiSigTest = new MS_YTP_WBT_59760(chain, deployer);
        let ytpPoolToken = new POOLTOKEN_YTP_WBTC_WBTC_59760(chain, deployer);
        let usdaToken = new USDAToken(chain, deployer);
        let wbtcToken = new WBTCToken(chain, deployer);
        const buffer = new ArrayBuffer(0)   // Optional memo

        let money = usdaToken.transferToken(10*ONE_8,deployer.address,wallet_2.address, buffer);
        money = wbtcToken.transferToken(10*ONE_8,deployer.address,wallet_2.address, buffer);
        money.expectOk()

        //Deployer creating a pool, initial tokens injected to the pool
        let result = YTPTest.createPool(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, multisigytpyieldwbtc59760, 1000*ONE_8, 1000*ONE_8);
        result.expectOk().expectBool(true);

        // Duplicated Pool 
        result = YTPTest.createPool(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, multisigytpyieldwbtc59760, 1000*ONE_8, 1000*ONE_8);
        result.expectErr().expectUint(2000);

        // Check pool details and print
        let call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        let position:any = call.result.expectOk().expectTuple();
        position['balance-token'].expectUint(1000*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(1000*ONE_8);
        
        // Attempts to inject zero liquidity
        result = YTPTest.addToPosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 0);
        position = result.expectErr().expectUint(2003)

        //Attempt to add extra liquidity but not enough balance
        result = YTPTest.addToPosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 1000000*ONE_8);
        position = result.expectErr().expectUint(3001)

        // Attempts for trivial reducing
        result = YTPTest.reducePosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 0);
        position =result.expectErr().expectUint(1)

        // Attempts for trivial reduce more than 100%
        result = YTPTest.reducePosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 101*ONE_8);
        position =result.expectErr().expectUint(5000)

        // Another user attempts to reduce liquidity with not enough pool token 
        result = YTPTest.reducePosition(wallet_2, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 1*ONE_8);
        position =result.expectErr().expectUint(1)

        // Deployer adds liquidity
        result = YTPTest.addToPosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 1000*ONE_8);
        position = result.expectOk().expectTuple();
        position['supply'].expectUint(1000*ONE_8);
        position['balance-token'].expectUint(1000*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(1000*ONE_8);     

        // Another User adds liquidity
        result = YTPTest.addToPosition(wallet_2, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 10*ONE_8);
        position = result.expectOk().expectTuple();
        position['supply'].expectUint(10*ONE_8);
        position['balance-token'].expectUint(10*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(10*ONE_8);     

        // Another user attempts to reduce liquidity with zero value
        result = YTPTest.reducePosition(wallet_2, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 0);
        position =result.expectErr().expectUint(1)

        // False swap value -- Filter added
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 0, 0);
        position =result.expectErr().expectUint(2003)
        
        // Too small => < max-slippage
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 0.0000001 * ONE_8, 0);
        position =result.expectErr().expectUint(2020);

        // Fixed
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 0.001 * ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(36251);
        position['dy'].expectUint(0.001 * ONE_8);

        // Attempt for Swapping
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(99944571);
        position['dy'].expectUint(ONE_8);

        // Attempts for zero value swapping
        result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, 0, 0);
        position =result.expectErr().expectUint(2003)

        // Attempts to swap more than available balance in the pool
        result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, 100*ONE_8, 0);
        position =result.expectErr().expectUint(2016) 

        // Swap
        result = YTPTest.swapXForY(deployer, yieldwbtc59760Address, wbtcAddress, 0.1 * ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(0.1 * ONE_8);
        position['dy'].expectUint(10043969);

    },    
});

Clarinet.test({
    name: "YTP : buy-and-add-to-position",

    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get("deployer")!;
        let wallet_1 = accounts.get("wallet_1")!;
        let YTPTest = new YTPTestAgent1(chain, deployer);

        //Deployer creating a pool, initial tokens injected to the pool
        let result = YTPTest.createPool(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, multisigytpyieldwbtc59760, 1000*ONE_8, 1000*ONE_8);
        result.expectOk().expectBool(true);

        // Check pool details and print
        let call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        let position:any = call.result.expectOk().expectTuple();
        position['balance-token'].expectUint(1000*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(1000*ONE_8);

        // inject some yield-token to pool
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 10 * ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(1000039937);
        position['dy'].expectUint(10 * ONE_8);

        // Check pool details and print
        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(1000*ONE_8);
        position['balance-token'].expectUint(1000*ONE_8 - 1000039937);
        position['balance-yield-token'].expectUint(10 * ONE_8);
        position['balance-virtual'].expectUint(1000*ONE_8);  

        // make sure wallet_1 does not have any yield-token
        call = chain.callReadOnlyFn(yieldwbtc59760Address, "get-balance", 
            [types.principal(wallet_1.address)
            ], wallet_1.address);
        call.result.expectOk().expectUint(0);            
        
        //Add extra liquidity with secondary buying of yield-token
        result = YTPTest.buyAndAddToPosition(wallet_1, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 10*ONE_8);
        position = result.expectOk().expectTuple();
        position['supply'].expectUint(909189000);
        position['balance-token'].expectUint(900997112);
        position['balance-yield-token'].expectUint(8191445);
        position['balance-virtual'].expectUint(909189002);
    }
});

Clarinet.test({
    name: "YTP : roll-position",

    async fn(chain: Chain, accounts: Map<string, Account>) {
        let deployer = accounts.get("deployer")!;
        let wallet_1 = accounts.get("wallet_1")!;
        let YTPTest = new YTPTestAgent1(chain, deployer);

        //Deployer creating a pool, initial tokens injected to the pool
        let result = YTPTest.createPool(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, multisigytpyieldwbtc59760, 1000*ONE_8, 1000*ONE_8);
        result.expectOk().expectBool(true);

        // Check pool details and print
        let call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        let position:any = call.result.expectOk().expectTuple();
        position['balance-token'].expectUint(1000*ONE_8);
        position['balance-yield-token'].expectUint(0);
        position['balance-virtual'].expectUint(1000*ONE_8);

        // inject some yield-token to pool
        result = YTPTest.swapYForX(deployer, yieldwbtc59760Address, wbtcAddress, 10 * ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(1000039937);
        position['dy'].expectUint(10 * ONE_8);

        // Check pool details and print
        call = await YTPTest.getPoolDetails(yieldwbtc59760Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(1000*ONE_8);
        position['balance-token'].expectUint(1000*ONE_8 - 1000039937);
        position['balance-yield-token'].expectUint(10 * ONE_8);
        position['balance-virtual'].expectUint(1000*ONE_8);  

        // make sure wallet_1 does not have any yield-token
        call = chain.callReadOnlyFn(yieldwbtc59760Address, "get-balance", 
            [types.principal(wallet_1.address)
            ], wallet_1.address);
        call.result.expectOk().expectUint(0);     
        
        // create another ytp
        result = YTPTest.createPool(deployer, yieldwbtc80875Address, wbtcAddress, ytpyieldwbtc80875Address, multisigytpyieldwbtc80875, 1000*ONE_8, 1000*ONE_8);
        result.expectOk().expectBool(true);       
        // inject some yield-token to pool
        result = YTPTest.swapYForX(deployer, yieldwbtc80875Address, wbtcAddress, 10 * ONE_8, 0);
        position =result.expectOk().expectTuple();
        position['dx'].expectUint(1000067035);
        position['dy'].expectUint(10 * ONE_8);     
        
        call = await YTPTest.getPoolDetails(yieldwbtc80875Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(1000*ONE_8);
        position['balance-token'].expectUint(1000*ONE_8 - 1000067035);
        position['balance-yield-token'].expectUint(10 * ONE_8);
        position['balance-virtual'].expectUint(1000*ONE_8);          
        
        //Add extra liquidity with secondary buying of yield-token
        result = YTPTest.rollPosition(deployer, yieldwbtc59760Address, wbtcAddress, ytpyieldwbtc59760Address, 0.5*ONE_8, yieldwbtc80875Address, ytpyieldwbtc80875Address);
        position = result.expectOk().expectTuple();
        position['supply'].expectUint(50354658000);
        position['balance-token'].expectUint(49900929799);
        position['balance-yield-token'].expectUint(453675742);
        position['balance-virtual'].expectUint(50354658105);

        // Check pool details and print
        call = await YTPTest.getPoolDetails(yieldwbtc80875Address);
        position = call.result.expectOk().expectTuple();
        position['total-supply'].expectUint(1000*ONE_8 + 50354658000);
        // a bit more than 148900862764 = 1000*ONE_8 - 1000067035 + 49900929799, due to buy-and-add-to-position
        position['balance-token'].expectUint(148999862966); 
        // a bit less then 1453675742 = 0 + 10 * ONE_8 + 453675742, due to buy-and-add-to-position
        position['balance-yield-token'].expectUint(1354636777);
        position['balance-virtual'].expectUint(1000*ONE_8 + 50354658105);          
    }
});