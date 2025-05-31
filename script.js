const { Connection, PublicKey } = solanaWeb3;
const { TOKEN_PROGRAM_ID } = splToken;

const connection = new Connection("https://solana-rpc.publicnode.com", "confirmed");

async function checkEmptyTokenAccounts(wallet) {
    const emptyList = [];

    const accounts = await connection.getParsedTokenAccountsByOwner(wallet, {
        programId: TOKEN_PROGRAM_ID
    });

    accounts.value.forEach(({ pubkey, account }) => {
        const tokenInfo = account.data?.parsed?.info;
        const amount = tokenInfo.tokenAmount.uiAmount;
        const ataAddress = pubkey.toString();

        if (amount === 0) {
            emptyList.push(ataAddress);
        }
    });

    return emptyList;
}

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById("wallet-form");
    const walletInput = document.getElementById("wallet");
    const countEl = document.getElementById("count");

    form.addEventListener('submit', async function (event) {
        event.preventDefault(); // ✅ stop form refresh

        const address = walletInput.value.trim();
        if (!address) return;

        countEl.textContent = "Checking..."

        try {
            const publicKey = new PublicKey(address);
            const emptyAccounts = await checkEmptyTokenAccounts(publicKey);

            let fee = emptyAccounts.length * 0.002;

            countEl.textContent = `Empty Accounts: ${emptyAccounts.length} ~ ${fee.toFixed(3)} Sol `;

        } catch (err) {
            console.error("Error:", err);
            countEl.textContent = "Invalid wallet address";
        }
    });
});
