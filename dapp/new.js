const { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } = solanaWeb3;
const { TOKEN_PROGRAM_ID, Token } = splToken;

const connection = new Connection("https://solana-rpc.publicnode.com", "confirmed");

const msg = document.getElementById('alert');

const objects = document.getElementById("data");

let singer;

let checked = false;

const emptyAccount = [];







document.addEventListener('DOMContentLoaded', function () {

    if (window.solana && window.solana.isPhantom) {
        window.solana.on("accountChanged", (publicKey) => {
            if (publicKey) {
                // User switched to a different account
                singer = publicKey;
                document.getElementById("connect").innerHTML = singer.toString().slice(0, 2) + "..." + singer.toString().slice(-4);
                checked = false;
                getAccounts(); // Refresh data for new account
            } else {
                // User disconnected their wallet
                singer = null;
                document.getElementById("connect").innerHTML = "Connect Wallet";
            }
        });
    }

});

async function connect() {
    if (window.solana && window.solana.isPhantom) {
        try {
            const response = await window.solana.connect();
            singer = response.publicKey;
            document.getElementById("connect").innerHTML = singer.toString().slice(0, 2) + "..." + singer.toString().slice(-4);

            getAccounts();

        } catch (err) {
            console.error("Connection error:", err);
        }

    } else {

        alert("Phantom wallet not found.");
    }
}

document.getElementById("connect").addEventListener('click', connect);






async function getAccounts() {

    if (!checked) {

        checked = true;

        const obj = document.createElement("div");
        obj.classList.add('spl');

        objects.appendChild(obj);

        obj.innerHTML = `
                <div class="logo">
                    <img src="https://placehold.co/64">
                </div>
                <div>
                    <h3>Loading...</h3>
                    <p>Balance: 0</p>
                </div>
            `;

        const accounts = await connection.getParsedTokenAccountsByOwner(singer, {
            programId: TOKEN_PROGRAM_ID
        });

        emptyAccount.length = 0;

        objects.innerHTML = "";

        accounts.value.forEach(({ pubkey, account }) => {
            const token = account.data?.parsed?.info;
            const amount = token.tokenAmount.uiAmount;
            const mint = token.mint;

            if (amount === 0) {
                emptyAccount.push(pubkey);

                const obj = document.createElement("div");
                obj.classList.add('spl');

                objects.appendChild(obj);

                getMetadata(mint, obj);
            }

        });

        const total = emptyAccount.length;
        const balance = total * 0.002;
        const value = balance * 200;

        if (total > 0) {

            document.getElementById("total").innerHTML = total;
            document.getElementById("balance").innerText = balance.toFixed(3) + " sol";
            document.getElementById("value").innerText = "$ " + value.toFixed(2);

        } else {

            document.getElementById("total").innerHTML = total;
            document.getElementById("balance").innerText = "Recovered";
            document.getElementById("value").innerText = "$ 0.00";

        }

    }

}









async function getMetadata(ca, element) {
    const mintKey = new PublicKey(ca);
    const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

    let metadata = {
        name: "Unknown",
        image: "https://placehold.co/64"
    };

    try {
        const [metadataPDA] = await solanaWeb3.PublicKey.findProgramAddress(
            [
                new TextEncoder().encode("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                mintKey.toBuffer()
            ],
            METADATA_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(metadataPDA);
        if (!accountInfo) throw new Error("Metadata account not found");

        const data = accountInfo.data;
        const uri = new TextDecoder().decode(data.slice(117, 317)).replace(/\0/g, '').trim();
        if (!uri) throw new Error("Invalid metadata URI");

        const fetchedMetadata = await (await fetch(uri)).json();
        metadata.name = fetchedMetadata.name || metadata.name;
        metadata.symbol = fetchedMetadata.symbol || metadata.symbol;
        metadata.image = fetchedMetadata.image || metadata.image;
    } catch (error) {
        console.warn(error.message);
    }

    element.innerHTML = `
            <div class="logo">
                <img src="${metadata.image}">
            </div>
            <div>
                <h3>${metadata.name}</h3>
                <p>Balance: 0</p>
            </div>
        `;
}
















async function closeAccounts() {

    const transaction = new Transaction();

    const accountsToClose = emptyAccount.slice(0, 50);

    for (const tokenAccount of accountsToClose) {

        try {
            const ix = Token.createCloseAccountInstruction(
                TOKEN_PROGRAM_ID,
                tokenAccount,
                singer,
                singer,
                []
            );

            transaction.add(ix);

            console.log(tokenAccount);

        } catch (err) {

            console.warn(err);

        }

    }


    try {

        transaction.feePayer = singer;
        const { blockhash } = await connection.getLatestBlockhash("finalized");
        transaction.recentBlockhash = blockhash;

        const signed = await window.solana.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signed.serialize());

        await connection.confirmTransaction(signature, "confirmed");

        msg.classList.add('show');

        checked = false;

        getAccounts();

        let value = accountsToClose.length * 0.002;

        let tx = "https://solscan.io/tx/" + signature;

        msg.innerHTML = `
            <div>
                <h4>
                    <i class="fa-solid fa-square-check"></i> Let'z Go !?
                </h4>
                <p>
                    Reclaimed <span>${value.toFixed(3)} sol</span>, Returned to your mighty wallet.
                </p>
            </div>
            <p>
                Check the transaction on <a target="_blank" href="${tx}">[ solscan.io ].</a>
            </p>
        `;

        setTimeout(() => {
            msg.classList.remove('show');
        }, 15000);

    } catch (err) {

        console.error("❌ Failed to close accounts:", err);

    }

}



document.getElementById("claim").addEventListener('click', closeAccounts);
