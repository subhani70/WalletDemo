const EthrDIDRegistry = artifacts.require("EthrDIDRegistry");

module.exports = function(deployer) {
  deployer.deploy(EthrDIDRegistry);
};