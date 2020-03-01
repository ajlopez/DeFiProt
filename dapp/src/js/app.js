
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
    "host": "https://public-node.testnet.rsk.co:443",
    "accounts": {
        "root": {
            "privateKey": "0xd093f91cb7ce13874b4a3ef053e0b30e86b289952eb14fdd5f880aa04dcb8798",
            "publicKey": "0x7b1178a843459c803c7c8a39c78080a68317b3be0e72ddd70dce6169bd62fc48ed690439c3d04f12820346606736250f5f4e65f7020bb2a40f25199c2f4c1a3a",
            "address": "0xb5b981b5674fea37add3ae8ef21e96dab52a898d"
        },
        "alice": {
            "privateKey": "0x2d0a0f1a3d7ea7134aa764bd3bd5a25b1579508f8d88065909d2996603b73c4d",
            "publicKey": "0x5c9c8f6d56525caade626566bf7f5a2d789a0c49b3fb93e88e33314f58529c547c048b33fa119452916927dd0fa912d14a0d10495fd535b7b4cc3d9bad7f019a",
            "address": "0x1cd91c1272e255ac601359a840708119146b1308"
        },
        "charlie": {
            "privateKey": "0x3e929a849b8a40709881cc4253a66b3f741cfa6b6f3282a511436a15fcd76554",
            "publicKey": "0x97d558eadd2d316d58b133f310cb4857bff48909ea99a3c0a2226e3fbe4e5288639c5aa96194d60f52888855540ba0247e14f77093825a5bc77bb35b2846ad79",
            "address": "0x80a8a51d473c61cae66c06168c2a59dfb6503716"
        },
        "bob": {
            "privateKey": "0xcc19a97bb681dce4ea90f7822a7d796b0fadc62751fc37ac42dc0745faf71966",
            "publicKey": "0x08b65ab5d38b25130218076b6fe17456f78e87b0b0e657d544d9730ed3bcbd17fa27203d58a3c537428562c13971d8d0a68dfe923d164dc8b571d95e86934446",
            "address": "0x2d2fedbe61c521472455f2d668e706c491eef835"
        }
    },
    "instances": {
        "token1": {
            "address": "0xd2310f43dddb85c1fab2023b90af5cf5a5bfcf77",
            "contract": "FaucetToken"
        },
        "token2": {
            "address": "0x16726a6080b2dc52240b07887d21e46fbceedd54",
            "contract": "FaucetToken"
        },
        "token3": {
            "address": "0xb21728616bba4e2febc9e79804da000ad637404b",
            "contract": "FaucetToken"
        }
    },
    "options": {}
};

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
            const address = account.address;
            
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
            const address = account.address;
            
            var request = {
                id: ++id,
                jsonrpc: "2.0",
                method: "eth_call",
                params: [ {
                    from: config.accounts.root.address,
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

    function distributeTokenWithSignature(network, from, balance, token, accounts, nonce) {
        let privateKey = from.privateKey;
        
        if (privateKey.startsWith('0x'))
            privateKey = privateKey.substring(2);
        
        const privateBuffer = new ethereumjs.Buffer.Buffer(privateKey, 'hex');
        
        var to = randomAccount(accounts);
        var amount = Math.floor(Math.random() * balance / 2);
        
        const transaction = {
            nonce: nonce,
            to: token,
            value: 0,
            gas: 6000000,
            gasPrice: 0,
            data: "0xa9059cbb000000000000000000000000" + to.substring(2) + toHex(amount)
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
    
    function distributeToken(network, from, balance, token, accounts) {
        if (from && from.privateKey) {
            getNonce(network, from.address, function (data) {
                if (typeof data === 'string')
                    data = JSON.parse(data);
                
                distributeTokenWithSignature(network, from, balance, token, accounts, data.result);
            });
            
            return;
        }
        
        var to = randomAccount(accounts);
        var amount = Math.floor(Math.random() * balance / 2);
        
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
        fetchBalances: fetchBalances
    }
})();

