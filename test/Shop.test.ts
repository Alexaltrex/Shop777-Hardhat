import {expect} from "chai";
import {ethers} from "hardhat";
import {loadFixture, time, setBalance} from "@nomicfoundation/hardhat-network-helpers";
import tokenArtefact from "../artifacts/contracts/Token.sol/Token.json";


describe("Shop", () => {
    async function deployFixture() {
        const [owner, buyer, seller] = await ethers.getSigners();
        const initialSupply = 100;
        const ContractFactory = await ethers.getContractFactory("Shop");
        const shop = await ContractFactory.deploy(initialSupply);
        await shop.deployed();

        //new ethers.Contract( address , abi , signerOrProvider )
        const shopSigner = ContractFactory.signer;
        const token = new ethers.Contract(await shop.token(), tokenArtefact.abi, shopSigner);
        return {owner, buyer, seller, shop, token, initialSupply}
    }

    describe("Token Price For Sell", () => {
        it("getTokenPriceForSell - correct value after deploy", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            expect(await shop.getTokenPriceForSell()).to.equal(90);
        })

        it("getTokenPriceForSell, setTokenPriceForSell - returns correct value after change", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForSell = 80;
            const setTokenPriceForSellTx = await shop.connect(owner).setTokenPriceForSell(newTokenPriceForSell);
            await setTokenPriceForSellTx.wait();
            expect(await shop.getTokenPriceForSell()).to.equal(newTokenPriceForSell);
        })

        it("setTokenPriceForSell - can only call owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForSell = 80;
            await expect(shop.connect(buyer).setTokenPriceForSell(newTokenPriceForSell))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setTokenPriceForSell - cannot be set 0", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForSell = 0;
            await expect(shop.connect(owner).setTokenPriceForSell(newTokenPriceForSell))
                .to.be.revertedWith("Shop: price could not be equal 0");
        })

        it("setTokenPriceForSell - raises the SellPriceChange event with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const oldPrice = (await shop.getTokenPriceForSell()).toNumber();
            const newTokenPriceForSell = 80;
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            expect(await shop.connect(owner).setTokenPriceForSell(newTokenPriceForSell))
                .emit(shop, "SellPriceChange")
                .withArgs(oldPrice, newTokenPriceForSell, timestamp)
        })
    })

    describe("Token Price For Buy", () => {
        it("getTokenPriceForBuy - correct value after deploy", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            expect(await shop.getTokenPriceForBuy()).to.equal(100);
        })

        it("getTokenPriceForBuy, setTokenPriceForBuy - returns correct value after change", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForBuy = 110;
            const setTokenPriceForBuyTx = await shop.connect(owner).setTokenPriceForBuy(newTokenPriceForBuy);
            await setTokenPriceForBuyTx.wait();
            expect(await shop.getTokenPriceForBuy()).to.equal(newTokenPriceForBuy);
        })

        it("setTokenPriceForBuy - can only call owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForBuy = 110;
            await expect(shop.connect(buyer).setTokenPriceForBuy(newTokenPriceForBuy))
                .to.be.revertedWith("Ownable: caller is not the owner");
        })

        it("setTokenPriceForBuy - cannot be set 0", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const newTokenPriceForBuy = 0;
            await expect(shop.connect(owner).setTokenPriceForBuy(newTokenPriceForBuy))
                .to.be.revertedWith("Shop: price could not be equal 0");
        })

        it("setTokenPriceForBuy - raises the BuyPriceChange event with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            const oldPrice = (await shop.getTokenPriceForBuy()).toNumber();
            const newTokenPriceForBuy = 110;
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            expect(await shop.connect(owner).setTokenPriceForBuy(newTokenPriceForBuy))
                .emit(shop, "BuyPriceChange")
                .withArgs(oldPrice, newTokenPriceForBuy, timestamp)
        })
    })

    describe("deploy", () => {

        it("name, symbol, totalSupply", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            expect(await token.name()).to.equal("Lucky Number Token");
            expect(await token.symbol()).to.equal("LNT");
            expect(await token.totalSupply()).to.equal(initialSupply);
        });

        it("shop own initialSupply count of tokens", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            expect(await token.balanceOf(shop.address)).to.equal(initialSupply);

        });

        it("shop - default operator", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            const defaultOperators = await token.defaultOperators();
            expect(defaultOperators[0]).to.equal(shop.address);
        })
    })

    describe("buyTokenFromShop", () => {

        it("if msg.value < price, corresponding error is raised", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            const value = 99;
            await expect(shop.buyTokensFromShop({value}))
                .to.be.revertedWith("Shop: not enough ethers for buy");
        })

        it("Buying a tokens correctly changes the buyer's and shop's token balances", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            const value = 200;
            // tokenCount = 200 / price (100) = 2
            await expect(shop.connect(buyer).buyTokensFromShop({value}))
                .to.changeTokenBalances(token, [buyer, shop], [+2, -2]);
        })

        it("Buying a tokens correctly changes the buyer's and shop's ether balances (rest = 0)", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            const value = 200;
            await expect(shop.connect(buyer).buyTokensFromShop({value}))
                .to.changeEtherBalances([buyer, shop], [-value, +value]);
        })

        it("Buying a tokens correctly changes the buyer's and shop's ether balances (rest > 0)", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            const value = 220;
            const valueTranslated = Math.floor(value / 100) * 100; // 200
            const tx = await shop.connect(buyer).buyTokensFromShop({value});
            await tx.wait();
            await expect(shop.connect(buyer).buyTokensFromShop({value}))
                .to.changeEtherBalances([buyer, shop], [-valueTranslated, +valueTranslated]);
        })

        it("Buying a token emit the correct event with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            const value = 200;
            const price = (await shop.getTokenPriceForBuy()).toNumber();
            const amountToBuy = Math.floor(value / price);
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(buyer).buyTokensFromShop({value}))
                .emit(shop, "Buy")
                .withArgs(buyer.address, amountToBuy, price, timestamp);
        })
    });

    describe("sellTokensToShop", () => {

        it("Selling 0 tokens generate corresponding error", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            await expect(shop.sellTokensToShop(0)).to.be.revertedWith("Shop: amount of tokens could not to be equal 0")
        });

        it("Selling a count of tokens less than seller owns generate corresponding error", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            // seller buy {count} tokens
            const countToBuy = 5;
            const tokenPriceForBuy = (await shop.getTokenPriceForBuy()).toNumber();
            const buyTx = await shop.connect(seller).buyTokensFromShop({value: countToBuy * tokenPriceForBuy});
            await buyTx.wait();
            expect(await token.balanceOf(seller.address)).to.equal(countToBuy);
            // try to sell
            const countToSell = 10;
            await expect(shop.connect(seller).sellTokensToShop(countToSell))
                .to.be.revertedWith("Shop: seller does not own that count of tokens");
        });


        it("If shop balance of ethers not enough to buy generates corresponding error", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            // seller buy {count} tokens
            const countToBuy = 5;
            const tokenPriceForBuy = (await shop.getTokenPriceForBuy()).toNumber();
            const buyTx = await shop.connect(seller).buyTokensFromShop({value: countToBuy * tokenPriceForBuy});
            await buyTx.wait();
            expect(await shop.connect(owner).getShopBalance()).to.equal(countToBuy * tokenPriceForBuy);
            // принудительно устанавливаем баланс магазина в 0
            await setBalance(shop.address, 0);
            expect(await shop.connect(owner).getShopBalance()).to.equal(0);
            // try to sell
            await expect(shop.connect(seller).sellTokensToShop(countToBuy))
                .to.be.revertedWith("Shop: shop does not have enough ether");
        });

        it("Selling a tokens correctly changes the seller and shop token balances", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            // seller buy {count} tokens
            const countToBuy = 5;
            const tokenPriceForBuy = (await shop.getTokenPriceForBuy()).toNumber();
            const buyTx = await shop.connect(seller).buyTokensFromShop({value: countToBuy * tokenPriceForBuy});
            await buyTx.wait();
            // sell
            await expect(shop.connect(seller).sellTokensToShop(countToBuy))
                .to.changeTokenBalances(token, [seller, shop], [-countToBuy, +countToBuy]);
        });

        it("Selling a tokens correctly changes the seller and shop ether balances", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            // seller buy {count} tokens
            const countToBuy = 5;
            const tokenPriceForBuy = (await shop.getTokenPriceForBuy()).toNumber();
            const buyTx = await shop.connect(seller).buyTokensFromShop({value: countToBuy * tokenPriceForBuy});
            await buyTx.wait();
            // sell
            const tokenPriceForSell = (await shop.getTokenPriceForSell()).toNumber();
            await expect(shop.connect(seller).sellTokensToShop(countToBuy))
                .to.changeEtherBalances(
                    [seller, shop],
                    [+countToBuy * tokenPriceForSell, -countToBuy * tokenPriceForSell]
                );

        });

        it("Selling a tokens emit the correct event with the correct arguments", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            // seller buy {count} tokens
            const countToBuy = 5;
            const tokenPriceForBuy = (await shop.getTokenPriceForBuy()).toNumber();
            const buyTx = await shop.connect(seller).buyTokensFromShop({value: countToBuy * tokenPriceForBuy});
            await buyTx.wait();
            // sell
            const tokenPriceForSell = (await shop.getTokenPriceForSell()).toNumber();
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(seller).sellTokensToShop(countToBuy))
                .emit(shop, "Sell")
                .withArgs(seller.address, countToBuy, tokenPriceForSell, timestamp);
        });

    });

    describe("mintToShop", () => {

        it("only owner can mint", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            await expect(shop.connect(seller).mintToShop(1))
                .to.be.revertedWith("Ownable: caller is not the owner")
        });

        it("mint 0 token revert transaction", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            await expect(shop.connect(owner).mintToShop(0))
                .to.be.revertedWith("Shop: amount of minted tokens could not to be equal 0");
        });

        it("mint tokens correctly changes the shop token balance", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            const amountToMint = 10;
            await expect(shop.connect(owner).mintToShop(amountToMint))
                .to.changeTokenBalance(token, shop, amountToMint);
        });

        it("mint tokens emit event", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            const amountToMint = 10;
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(owner).mintToShop(amountToMint))
                .emit(shop, "Mint")
                .withArgs(amountToMint, timestamp);
        });

    })

    describe("burnFromShop", () => {

        it("only owner can burn", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            await expect(shop.connect(seller).burnFromShop(1))
                .to.be.revertedWith("Ownable: caller is not the owner")
        });

        it("burn 0 token revert transaction", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            await expect(shop.connect(owner).burnFromShop(0))
                .to.be.revertedWith("Shop: amount of burned tokens could not to be equal 0");
        });

        it("burn tokens more than shop owns revert transaction", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            await expect(shop.connect(owner).burnFromShop(101))
                .to.be.revertedWith("Shop: shop does not own that count of tokens");
        });

        it("burn tokens emit event", async () => {
            const {owner, buyer, seller, shop, token, initialSupply} = await loadFixture(deployFixture);
            const amount = 1;
            const timestamp = 10000000000;
            await time.setNextBlockTimestamp(timestamp);
            await expect(shop.connect(owner).burnFromShop(amount))
                .emit(shop, "Burn")
                .withArgs(amount, timestamp);
        });
    });

    describe("withdrawAll", () => {
        it("Returns the correct value", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            expect(await shop.getShopBalance()).to.equal(0);
            await setBalance(shop.address, 1000);
            expect(await shop.getShopBalance()).to.equal(1000);
            // withdrawAll
            const tx = await shop.connect(owner).withdrawAll();
            await tx.wait();
            expect(await shop.getShopBalance()).to.equal(0);
        })

        it("shop and owner", async () => {
            const {owner, buyer, seller, shop, token} = await loadFixture(deployFixture);
            expect(await shop.getShopBalance()).to.equal(0);
            await setBalance(shop.address, 1000);
            expect(await shop.getShopBalance()).to.equal(1000);
            // withdrawAll
            await expect(shop.connect(owner).withdrawAll())
                .changeEtherBalances([shop, owner], [-1000, +1000]);
        })
    })


})
