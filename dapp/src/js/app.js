
const pages = (function () {
    let active = null;
    
    function goTo(page) {
        if (active) {
            $("#page_" + active).hide();
        
            const olditem = $("#item_" + active);
            
            if (olditem)
                olditem.removeClass('nav-active');
        }
        
        $("#page_" + page).show();
        
        active = page;
        
        const newitem = $("#item_" + active);
        
        if (newitem)
            newitem.addClass('nav-active');
    }
    
    return {
        goTo: goTo
    }
})();

const config = {
    "host": "http://localhost:4444",
    "accounts": {
        "root": "0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826",
        "alice": {
            "privateKey": "0x2bf93aab141735a82000d35d8bf6f1c4f8a31b7c2e0d219db32c8d21da6e1a94",
            "publicKey": "0x88c053b0d189752cc31677d68145408b4ef61e6e1646a3ce5b84c3d2de7f02ca262e9d1e8ece5090c655db32dc8b56bc72dae1cde485d366bcc89742cc6c122c",
            "address": "0xe16cdd58c9c85e02bb17ee245def7108532bf1b8"
        },
        "bob": {
            "privateKey": "0x5b470eedae15ea8a3f6cbbf765d2c5fa7e0746f270711d60b9db5912e5ea97ab",
            "publicKey": "0x779889adc6644cf8eec31ad533c2b146722f89e246954b64a95536607215f9ce4a9bac08b228922017b7fc883823b678e97f018f1b1a68782af2077b5b8f8cbc",
            "address": "0xd9ac9fa663de2d191813e3906db11f4241751d3c"
        },
        "charlie": {
            "privateKey": "0x7958be6885c639cefc0c0dc8e4f0d1d57c29b0e354406f3adc9eab9a4fcf44b7",
            "publicKey": "0x7ee1c66dab4908f59abaa1e5237d8769fb57aabbecfd81d46971023395b35c32482f284646188b4b45ca4a7c1966ebf9071acb1c6f0170cccb501ffc60b1ca43",
            "address": "0xa42e8733778cde598bd2fdf5a09b2100a3194f98"
        }
    },
    "instances": {
        "token1": {
            "address": "0xe0825f57dd05ef62ff731c27222a86e104cc4cad",
            "contract": "FaucetToken"
        },
        "token2": {
            "address": "0x73ec81da0c72dd112e06c09a6ec03b5544d26f05",
            "contract": "FaucetToken"
        },
        "token3": {
            "address": "0x03f23ae1917722d5a27a2ea0bcc98725a2a2a49a",
            "contract": "FaucetToken"
        },
        "controller": {
            "address": "0x0e19674ebc2c2b6df3e7a1417c49b50235c61924",
            "contract": "Controller"
        },
        "market1": {
            "address": "0x8901a2bbf639bfd21a97004ba4d7ae2bd00b8da8",
            "contract": "Market"
        },
        "market2": {
            "address": "0xdac5481925a298b95bf5b54c35b68fc6fc2ef423",
            "contract": "Market"
        },
        "market3": {
            "address": "0x987c1f13d417f7e04d852b44badc883e4e9782e1",
            "contract": "Market"
        }
    },
    "options": {}
};

const rootaddress = config.accounts.root.address ? config.accounts.root.address : config.accounts.root;

const fnhashes = {
    'balanceOf(address)': '0x1d7976f3'
}

var app = (function () {
    var names = [ 'Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Fiona', 'Ginger', 'Hanna', 'Ian', 'John', 'Kim', 'Louise', 'Marty', 'Nancy', 'Ophrah', 'Peter', 'Robert', 'Sam', 'Tina', 'Umma', 'Vanessa', 'Wilma' ];
    
    var id = 0;
    var mainhost;
    var sidehost;
    
    function post(host, request, fn) {
// https://stackoverflow.com/questions/2845459/jquery-how-to-make-post-use-contenttype-application-json
        
        $.ajaxSetup({
            contentType: "application/json; charset=utf-8"
        });
        
        $.post(
            host,
            JSON.stringify(request),
            fn
        );
    }

    function show(data) {
        alert(JSON.stringify(data, null, 4));
    }
        
    function fetchBalances(bfn) {
        for (let n in config.accounts)
            fetchAccountBalances(n, config.accounts[n]);
        
        function fetchAccountBalances(accountname, account) {
            fetchAccountBalance(accountname, account, 'rbtc');
            
            for (let n in config.instances)
                fetchAccountAssetBalance(accountname, account, n, config.instances[n]);
        }
         
        function fetchAccountBalance(accountname, account, assetname) {
            const address = account.address ? account.address : account;
            
            var request = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_getBalance",
                params: [ address, 'latest']
            };
            
            post(config.host, request, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                const balance = parseInt(data.result);
                
                bfn(accountname, assetname, balance);
            });
        }
        
        function fetchAccountAssetBalance(accountname, account, assetname) {
            const address = account.address ? account.address : account;
            
            const request = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [ {
                    from: rootaddress,
                    to: config.instances[assetname].address,
                    gas: '0x010000',
                    gasPrice: '0x0',
                    value: '0x0',
                    data: '0x70a08231' + toHex(address)
                }, 'latest' ]
            };
            
            post(config.host, request, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                const balance = parseInt(data.result);
                
                bfn(accountname, assetname, balance);
            });
        }
    }
    
    function fetchPositions(bfn) {
        for (let n in config.accounts) {
            if (n === 'root')
                continue;
            
            fetchAccountPositions(n, config.accounts[n]);
        }
        
        function fetchAccountPositions(accountname, account) {
            for (let n in config.instances) {
                if (!n.startsWith('market'))
                    continue;
                
                fetchAccountMarketPositions(accountname, account, n, config.instances[n]);
            }
        }
         
        function fetchAccountMarketPositions(accountname, account, marketname, market) {
            const address = account.address ? account.address : account;
            
            const request = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [ {
                    from: rootaddress,
                    to: config.instances[marketname].address,
                    gas: '0x010000',
                    gasPrice: '0x0',
                    value: '0x0',
                    data: '0xe681dc71' + toHex(address)
                }, 'latest' ]
            };
                        
            post(config.host, request, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                const value = parseInt(data.result);
                
                bfn(accountname, marketname, 'supplies', value);
            });
            
            const request2 = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [ {
                    from: rootaddress,
                    to: config.instances[marketname].address,
                    gas: '0x010000',
                    gasPrice: '0x0',
                    value: '0x0',
                    data: '0x2aad6aa8' + toHex(address)
                }, 'latest' ]
            };
                        
            post(config.host, request2, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                const value = parseInt(data.result);
                
                bfn(accountname, marketname, 'borrows', value);
            });
        }
    }
    
    function fetchLiquidities(bfn) {
        for (let n in config.accounts) {
            if (n === 'root')
                continue;
            
            fetchAccountLiquidity(n, config.accounts[n]);
        }
        
        function fetchAccountLiquidity(accountname, account) {
            const address = account.address ? account.address : account;
            
            var request = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [ {
                    from: rootaddress,
                    to: config.instances.controller.address,
                    gas: '0x010000',
                    gasPrice: '0x0',
                    value: '0x0',
                    data: '0x5ec88c79' + toHex(account.address)
                }, 'latest' ]
            };
                        
            post(config.host, request, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                const liquidity = parseInt(data.result);
                
                bfn(accountname, liquidity);
            });
        }
    }

    function fetchMarkets(bfn) {
        for (let n in config.instances) {
            if (!n.startsWith('market'))
                continue;
            
            fetchMarket(n);
        }
        
        function fetchMarket(marketname) {
            const request = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [ {
                    from: rootaddress,
                    to: config.instances[marketname].address,
                    gas: '0x010000',
                    gasPrice: '0x0',
                    value: '0x0',
                    data: '0xc2b170cb'
                }, 'latest' ]
            };
                        
            post(config.host, request, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                const value = parseInt(data.result);
                
                bfn(marketname, 'supplies', value);
            });
            
            const request2 = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [ {
                    from: rootaddress,
                    to: config.instances[marketname].address,
                    gas: '0x010000',
                    gasPrice: '0x0',
                    value: '0x0',
                    data: '0x78f1dc03'
                }, 'latest' ]
            };
                        
            post(config.host, request2, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                const value = parseInt(data.result);
                
                bfn(marketname, 'borrows', value);
            });
        }
        
        function fetchAccountAssetBalance(accountname, account, assetname) {
            const address = account.address;
           
            const request = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [ {
                    from: rootaddress,
                    to: config.instances[assetname].address,
                    gas: '0x010000',
                    gasPrice: '0x0',
                    value: '0x0',
                    data: '0x70a08231' + toHex(account.address)
                }, 'latest' ]
            };
            
            post(config.host, request, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                const balance = parseInt(data.result);
                
                bfn(accountname, assetname, balance);
            });
        }
    }
    
    function randomAccount(accounts) {
        while (true) {            
            var n = Math.floor(Math.random() * accounts.length);
            
            if (accounts[n].name.indexOf('ridge') >= 0)
                continue;
            
            if (accounts[n].address.address)
                return accounts[n].address.address;
            
            return accounts[n].address;
        }
    }
    
    function toHex(value) {
        if (typeof value === 'string' && value.substring(0, 2) === '0x')
            var text = value.substring(2);
        else
            var text = value.toString(16);
        
        while (text.length < 64)
            text = '0' + text;
        
        return text;
    }
    
    function getNonce(host, address, fn) {
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_getTransactionCount",
            params: [ address, "pending" ]
        };
        
        post(host, request, fn);
    }

// https://ethereum.stackexchange.com/questions/8579/how-to-use-ethereumjs-tx-js-in-a-browser

    function transferWithSignature(network, from, to, token, amount, nonce) {
        let privateKey = from.privateKey;
        
        if (privateKey.startsWith('0x'))
            privateKey = privateKey.substring(2);
        
        const privateBuffer = new ethereumjs.Buffer.Buffer(privateKey, 'hex');

        const toaddress = to.address ? to.address : to;
        
        var transaction = {
            nonce: nonce,
            to: token,
            value: 0,
            gas: 6000000,
            gasPrice: 0,
            data: "0xa9059cbb000000000000000000000000" + toaddress.substring(2) + toHex(amount)
        };
        
        const tx = new ethereumjs.Tx(transaction);
        tx.sign(privateBuffer);
        const serializedTx = tx.serialize().toString('hex'); 
        
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_sendRawTransaction",
            params: [ serializedTx ]
        };
        
        post(getHost(network), request, console.log);
    }

    function transfer(network, from, to, token, amount) {
        if (from && from.privateKey) {
            getNonce(network, from.address, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                transferWithSignature(network, from, to, token, amount, data.result);
            });
            
            return;
        }

        var tx = {
            from: from,
            to: token,
            value: 0,
            gas: 6000000,
            gasPrice: 0,
            data: "0xa9059cbb000000000000000000000000" + to.substring(2) + toHex(amount)
        };
        
        var request = {
            id: ++id,
            jsonrpc: "2.0",
            method: "eth_sendTransaction",
            params: [ tx ]
        };
        
        post(getHost(network), request, console.log);
    }

    function distributeTokens(network, accounts, cb) {
        var naccounts = accounts.length;
        
        for (var k = 0; k < naccounts; k++) {
            var name = accounts[k].name;
            
            if (name.indexOf('ridge') >= 0)
                continue;
            
            if (accounts[k].balance)
                distributeToken(network, accounts[k].address, accounts[k].balance, getToken(network), accounts);
        }
        
        setTimeout(cb, 2000);
    }
    
    return {
        fetchBalances: fetchBalances,
        fetchLiquidities: fetchLiquidities,
        fetchMarkets: fetchMarkets,
        fetchPositions: fetchPositions
    }
})();

