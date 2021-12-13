import {
  AnchorMode,
  broadcastTransaction,
  makeContractCall,
  PostConditionMode,
  uintCV,
} from '@stacks/transactions';
import { principalCV } from '@stacks/transactions/dist/clarity/types/principalCV';

import { getDeployerPK, network } from './wallet';
import { wait_until_confirmation } from './utils';
import { DEPLOYER_ACCOUNT_ADDRESS } from './constants';

export const setUsdaAmount = async (amount: number) => {
  console.log('[Faucet] set-usda-amount...', amount);
  const privateKey = await getDeployerPK();
  const txOptions = {
    contractAddress: DEPLOYER_ACCOUNT_ADDRESS(),
    contractName: 'faucet',
    functionName: 'set-usda-amount',
    functionArgs: [uintCV(amount)],
    senderKey: privateKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };
  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    console.log(broadcastResponse);
    await wait_until_confirmation(broadcastResponse.txid);
  } catch (error) {
    console.log(error);
  }
};

export const setWbtcAmount = async (amount: number) => {
  console.log('[Faucet] set-wbtc-amount...', amount);
  const privateKey = await getDeployerPK();
  const txOptions = {
    contractAddress: DEPLOYER_ACCOUNT_ADDRESS(),
    contractName: 'faucet',
    functionName: 'set-wbtc-amount',
    functionArgs: [uintCV(amount)],
    senderKey: privateKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };
  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    console.log(broadcastResponse);
    await wait_until_confirmation(broadcastResponse.txid);
  } catch (error) {
    console.log(error);
  }
};

export const setStxAmount = async (amount: number) => {
  console.log('[Faucet] set-stx-amount...', amount);
  const privateKey = await getDeployerPK();
  const txOptions = {
    contractAddress: DEPLOYER_ACCOUNT_ADDRESS(),
    contractName: 'faucet',
    functionName: 'set-stx-amount',
    functionArgs: [uintCV(amount)],
    senderKey: privateKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };
  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    console.log(broadcastResponse);
    await wait_until_confirmation(broadcastResponse.txid);
  } catch (error) {
    console.log(error);
  }
};

export const setAlexAmount = async (amount: number) => {
  console.log('[Faucet] set-alex-amount...', amount);
  const privateKey = await getDeployerPK();
  const txOptions = {
    contractAddress: DEPLOYER_ACCOUNT_ADDRESS(),
    contractName: 'faucet',
    functionName: 'set-alex-amount',
    functionArgs: [uintCV(amount)],
    senderKey: privateKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };
  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    console.log(broadcastResponse);
    await wait_until_confirmation(broadcastResponse.txid);
  } catch (error) {
    console.log(error);
  }
};

export const getSomeTokens = async (recipient: string) => {
  console.log('[Faucet] get some tokens...');
  const privateKey = await getDeployerPK();
  const txOptions = {
    contractAddress: DEPLOYER_ACCOUNT_ADDRESS(),
    contractName: 'faucet',
    functionName: 'get-some-tokens',
    functionArgs: [principalCV(recipient)],
    senderKey: privateKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
  };
  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    console.log(broadcastResponse);
    await wait_until_confirmation(broadcastResponse.txid);
  } catch (error) {
    console.log(error);
  }
};
