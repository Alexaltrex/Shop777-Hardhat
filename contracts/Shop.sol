// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./Token.sol";
//import "hardhat/console.sol";

contract Shop is Ownable, IERC777Recipient {
    IERC1820Registry internal constant _ERC1820_REGISTRY = IERC1820Registry(0x1820a4B7618BdE71Dce8cdc73aAB6C95905faD24);
    uint public constant FEE = 5;

    //========= STATE =========//
    Token public token;
    uint _tokenPriceForSell = 90; // цена продажи магазину (wei / 1 unit of internal denomination)
    uint _tokenPriceForBuy = 100; // цена покупки у магазина (wei / 1 unit of internal denomination)

    //========= EVENTS =========//
    event SellPriceChange(uint oldValue, uint newValue, uint timestamp);
    event BuyPriceChange(uint oldValue, uint newValue, uint timestamp);
    event Buy(address indexed buyer, uint amount, uint price, uint timestamp); // покупка токена
    event Sell(address indexed seller, uint amount, uint price, uint timestamp); // продажа токена
    event Mint(uint amount, uint timestamp);
    event Burn(uint amount, uint timestamp);

    //========= CONSTRUCTOR =========//
    constructor(uint initialSupply) {
        address[] memory defaultOperators = new address[](1);
        defaultOperators[0] = address(this);
        token = new Token(initialSupply, defaultOperators);

        // register to ERC1820 registry
        _ERC1820_REGISTRY.setInterfaceImplementer(
            address(this),
            _ERC1820_REGISTRY.interfaceHash("ERC777TokensRecipient"),
            address(this)
        );
    }

    //========= TOKENS RECEIVED =========//
    function tokensReceived(
        address operator,
        address from,
        address to,
        uint amount,
        bytes calldata data,
        bytes calldata operatorData
    ) external override {
        //console.log("tokensReceived");
    }

    //========= GET TOKEN PRICE FOR SELL =========//
    function getTokenPriceForSell() public view returns (uint) {
        return _tokenPriceForSell;
    }

    //========= SET TOKEN PRICE FOR SELL =========//
    function setTokenPriceForSell(uint tokenPriceForSell_) external onlyOwner {
        require(tokenPriceForSell_ != 0, "Shop: price could not be equal 0");
        emit SellPriceChange(_tokenPriceForSell, tokenPriceForSell_, block.timestamp);
        _tokenPriceForSell = tokenPriceForSell_;
    }

    //========= GET TOKEN PRICE FOR BUY =========//
    function getTokenPriceForBuy() public view returns (uint) {
        return _tokenPriceForBuy;
    }

    //========= SET TOKEN PRICE FOR BUY =========//
    function setTokenPriceForBuy(uint tokenPriceForBuy_) external onlyOwner {
        require(tokenPriceForBuy_ != 0, "Shop: price could not be equal 0");
        emit BuyPriceChange(_tokenPriceForBuy, tokenPriceForBuy_, block.timestamp);
        _tokenPriceForBuy = tokenPriceForBuy_;
    }

    //========= BUY TOKENS FROM SHOP =========//
    function buyTokensFromShop() external payable {
        require(msg.value >= _tokenPriceForBuy, "Shop: not enough ethers for buy");

        uint amountToBuy = msg.value / _tokenPriceForBuy;
        // uint shopBalance = token.balanceOf(address(this));
        // shopBalance >= amountToBuy
        // shopBalance >= msg.value / _tokenPriceForBuy
        // shopBalance * _tokenPriceForBuy >= msg.value
        require(token.balanceOf(address(this)) * _tokenPriceForBuy >= msg.value, "Shop: shop doesn't have the required quantity of tokens");

        // send tokens to buyer
        token.send(msg.sender, amountToBuy, "");

        // if rest > 0, transfer {rest} ethers back to buyer
        uint rest = msg.value - (amountToBuy * _tokenPriceForBuy);
        if (rest > 0) {
            (bool success,) = msg.sender.call{value : rest}("");
            require(success, "NFTShop: transfer rest ether to buyer failed");
        }

        emit Buy(msg.sender, amountToBuy, _tokenPriceForBuy, block.timestamp);
    }

    //========= SELL TOKENS TO SHOP =========//
    function sellTokensToShop(uint amount) external {
        // нельзя продать 0 токенов
        require(amount > 0, "Shop: amount of tokens could not to be equal 0");

        // продавец имеет заявленное количество токенов
        require(token.balanceOf(msg.sender) >= amount, "Shop: seller does not own that count of tokens");

        // магазин имеет достаточное количество эфира для покупки токенов у продавца
        require(address(this).balance >= amount * _tokenPriceForSell, "Shop: shop does not have enough ether");

        // магазин является оператором для продавца (может переводит его токены)
        //require(token.isOperatorFor(address(this), msg.sender), "Shop: shop is not operator for seller");

        // магазин переводит токены от продавца в магазин
        token.operatorSend(msg.sender, address(this), amount, "", "");

        // возмещаем продавцу деньги
        (bool success,) = msg.sender.call{value : amount * _tokenPriceForSell}("");
        require(success, "NFTShop: transfer ether to seller failed");

        emit Sell(msg.sender, amount, _tokenPriceForSell, block.timestamp);
    }

    //========= GET SHOP BALANCE =========//
    function getShopBalance() public view onlyOwner returns (uint) {
        return address(this).balance;
    }

    //========= MINT TO SHOP =========//
    function mintToShop(uint amount) external onlyOwner {
        require(amount > 0, "Shop: amount of minted tokens could not to be equal 0");
        token.mint(amount);
        emit Mint(amount, block.timestamp);
    }

    //========= BURN FROM SHOP =========//
    function burnFromShop(uint amount) external onlyOwner {
        require(amount > 0, "Shop: amount of burned tokens could not to be equal 0");
        require(amount <= token.balanceOf(address(this)), "Shop: shop does not own that count of tokens");
        token.burn(amount, "");
        emit Burn(amount, block.timestamp);
    }

    //========= WITHDRAW ALL =========//
    function withdrawAll() public onlyOwner {
        address owner = owner();
        (bool success,) = owner.call{value : address(this).balance}("");
        require(success, "NFTShop: withdraw failed");
    }

}
