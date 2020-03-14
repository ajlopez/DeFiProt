node genaccount alice
node genaccount bob
node genaccount charlie

node transfer root alice 1000000000000
node transfer root bob 1000000000000
node transfer root charlie 1000000000000

node deploy root token1 FaucetToken "1000000000;Token 1;0;TOK1"
node deploy root token2 FaucetToken "1000000000;Token 2;0;TOK2"
node deploy root token3 FaucetToken "1000000000;Token 3;0;TOK3"

node invoke root token1 allocateTo(address,uint256) alice;1000000
node invoke root token2 allocateTo(address,uint256) bob;1000000
node invoke root token3 allocateTo(address,uint256) charlie;1000000

