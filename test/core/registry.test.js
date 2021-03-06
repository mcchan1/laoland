/**
MIT License

Copyright (c) 2020 Openlaw

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
 */
const Web3 = require('web3-utils');
const DaoRegistry = artifacts.require("./core/DaoRegistry");
const FlagHelperLib = artifacts.require('./helpers/FlagHelper128');
DaoRegistry.link;

contract('Registry', async () => {
  
  let lib = await FlagHelperLib.new();
  await DaoRegistry.link("FlagHelper128", lib.address);

  it("should not be possible to add a module with invalid id", async () => {
    let moduleId = Web3.fromUtf8("");
    let moduleAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
    let registry = await DaoRegistry.new();
    try {
      await registry.addAdapter(moduleId, moduleAddress);
    } catch (error) {
      assert.equal(error.reason, "module id must not be empty");
    }
  });

  it("should not be possible to remove a module when it not registered", async () => {
    let moduleId = Web3.fromUtf8("1");
    let registry = await DaoRegistry.new();
    try {
      await registry.removeAdapter(moduleId);
    } catch (error) {
      assert.equal(error.reason, "module not registered");
    }
  });

  it("should not be possible to add a module with invalid address", async () => {
    let moduleId = Web3.fromUtf8("1");
    let moduleAddress = "";
    let registry = await DaoRegistry.new();
    try {
      await registry.addAdapter(moduleId, moduleAddress);
    } catch (error) {
      assert.equal(error.reason, "invalid address");
    }
  });

  it("should not be possible to add a module with empty address", async () => {
    let moduleId = Web3.fromUtf8("1");
    let moduleAddress = "0x0000000000000000000000000000000000000000";
    let registry = await DaoRegistry.new();
    try {
      await registry.addAdapter(moduleId, moduleAddress);
    } catch (error) {
      assert.equal(error.reason, "module address must not be empty");
    }
  });

  it("should not be possible to add a module when the id is already in use", async () => {
    let moduleId = Web3.fromUtf8("1");
    let moduleAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
    let registry = await DaoRegistry.new();
    //Add a module with id 1
    await registry.addAdapter(moduleId, moduleAddress);

    try {
      //Try to add another module using the same id 1
      await registry.addAdapter(moduleId, "0xd7bCe30D77DE56E3D21AEfe7ad144b3134438F5B");
    } catch (error) {
      assert.equal(error.reason, "module id already in use");
    }
  });

  it("should be possible to add a module with a valid id and address", async () => {
    let moduleId = Web3.fromUtf8("1");
    let moduleAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
    let registry = await DaoRegistry.new();
    await registry.addAdapter(moduleId, moduleAddress);
    let address = await registry.getAdapterAddress(moduleId);
    assert.equal(address, moduleAddress);
  });

  it("should be possible to remove a module", async () => {
    let moduleId = Web3.fromUtf8("2");
    let moduleAddress = "0x627306090abaB3A6e1400e9345bC60c78a8BEf57";
    let registry = await DaoRegistry.new();
    await registry.addAdapter(moduleId, moduleAddress);
    let address = await registry.getAdapterAddress(moduleId);
    assert.equal(address, moduleAddress);
    await registry.removeAdapter(moduleId);
    address = await registry.getAdapterAddress(moduleId);
    assert.equal(address, "0x0000000000000000000000000000000000000000");
  });

  it("should not be possible to remove a module that is not registered", async () => {
    let moduleId = Web3.fromUtf8("1");
    let registry = await DaoRegistry.new();

    try {
      await registry.removeAdapter(moduleId);
    } catch (error) {
      assert.equal(error.reason, "module not registered");
    }
  });

  it("should not be possible to remove a module with an empty id", async () => {
    let moduleId = Web3.fromUtf8("");
    let registry = await DaoRegistry.new();

    try {
      await registry.removeAdapter(moduleId);
    } catch (error) {
      assert.equal(error.reason, "module id must not be empty");
    }
  });

  it("should be possible to update delegate key", async () => {
    const myAccount = accounts[1];
    const delegateKey = accounts[2];
    let dao = await createDao(myAccount);

    const onboardingAddr = await dao.getAdapterAddress(sha3('onboarding'));
    const onboarding = await OnboardingContract.at(onboardingAddr);

    const myAccountActive1 = await dao.isActiveMember(myAccount);
    const delegateKeyActive1 = await dao.isActiveMember(delegateKey);

    assert.true(myAccountActive1);
    assert.false(delegateKeyActive1);

    await onboarding.updateDelegateKey(dao.address, delegateKey, { from: myAccount, gasPrice: toBN("0") });

    const myAccountActive2 = await dao.isActiveMember(myAccount);
    const delegateKeyActive2 = await dao.isActiveMember(delegateKey);

    assert.false(myAccountActive2);
    assert.true(delegateKeyActive2);
  });
});