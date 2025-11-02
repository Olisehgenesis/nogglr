import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const NogglrNFTModule = buildModule("NogglrNFTModule", (m) => {
  const proxyAdminOwner = m.getAccount(0);

  // Deploy the implementation contract
  const nogglrNFTImpl = m.contract("NogglrNFT");

  // Encode the initialize function call
  const encodedInitializeCall = m.encodeFunctionCall(nogglrNFTImpl, "initialize", []);

  // Deploy the TransparentUpgradeableProxy
  const proxy = m.contract("TransparentUpgradeableProxy", [
    nogglrNFTImpl,
    proxyAdminOwner,
    encodedInitializeCall,
  ]);

  // Get the ProxyAdmin address from the AdminChanged event
  const proxyAdminAddress = m.readEventArgument(
    proxy,
    "AdminChanged",
    "newAdmin"
  );

  // Create a contract instance for the ProxyAdmin
  const proxyAdmin = m.contractAt("ProxyAdmin", proxyAdminAddress, { id: "ProxyAdminInstance" });

  // Create a contract instance for NogglrNFT using the proxy address
  const nogglrNFT = m.contractAt("NogglrNFT", proxy, { id: "NogglrNFTProxy" });

  return { nogglrNFT, proxy, proxyAdmin, nogglrNFTImpl };
});

export default NogglrNFTModule;
