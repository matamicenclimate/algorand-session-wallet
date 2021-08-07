import AlgoSignerWallet from './wallets/algosigner'
import MyAlgoConnectWallet from './wallets/myalgoconnect'
import InsecureWallet from './wallets/insecure'
import { Wallet, SignedTxn } from './wallets/wallet'

import { Transaction } from 'algosdk'

export {Wallet, SignedTxn} from './wallets/wallet'

export const allowedWallets = {
        'algo-signer': AlgoSignerWallet,
        'my-algo-connect': MyAlgoConnectWallet,
        'insecure-wallet': InsecureWallet,
}

const walletPreferenceKey = 'wallet-preference'
const acctListKey = 'acct-list'
const acctPreferenceKey = 'acct-preference'
const mnemonicKey = 'mnemonic'

export class SessionWallet {
        wallet: Wallet
        wname: string
        network: string

        constructor(network: string, wname?: string) {
                if (wname) this.setWalletPreference(wname)

                this.network = network

                this.wname = this.walletPreference()

                if (!(this.wname in allowedWallets)) return

                this.wallet = new allowedWallets[this.wname](network)
                this.wallet.accounts = this.accountList()
                this.wallet.defaultAccount = this.accountIndex()
        }

        async connect(): Promise<boolean> {
		if(this.wallet === undefined) return false;

                switch (this.wname) {
                        case 'insecure-wallet':
                                const storedMnemonic = this.mnemonic()

                                const mnemonic = storedMnemonic ? storedMnemonic : 
                                prompt("Paste your mnemonic space delimited (DO NOT USE WITH MAINNET ACCOUNTS)")

                                if (!mnemonic) return false

                                if (await this.wallet.connect(mnemonic)) {
                                        this.setMnemonic(mnemonic)
                                        this.setAccountList(this.wallet.accounts)
                                        this.wallet.defaultAccount = this.accountIndex()
                                        return true
                                }

                                break

                        default:
                                if (await this.wallet.connect()) {
                                        this.setAccountList(this.wallet.accounts)
                                        this.wallet.defaultAccount = this.accountIndex()
                                        return true
                                }

                                break
                }

                // Fail
                this.disconnect()
                return false
        }

        connected(): boolean { return (this.wallet !== undefined && this.wallet.isConnected()) }

        setAccountList(accts: string[]) { sessionStorage.setItem(acctListKey, JSON.stringify(accts)) }
        accountList(): string[] {
                const accts = sessionStorage.getItem(acctListKey);
                return accts === "" || accts === null ? [] : JSON.parse(accts)
        }

        setAccountIndex(idx: number) { this.wallet.defaultAccount = idx; sessionStorage.setItem(acctPreferenceKey, idx.toString()) }
        accountIndex(): number {
                const idx = sessionStorage.getItem(acctPreferenceKey);
                return idx === null || idx === "" ? 0 : parseInt(idx, 10)
        }

        setWalletPreference(wname: string) { this.wname = wname; sessionStorage.setItem(walletPreferenceKey, wname) }
        walletPreference(): string {
                const wp = sessionStorage.getItem(walletPreferenceKey)
                return wp === null ? "" : wp
        }

        setMnemonic(m: string) { sessionStorage.setItem(mnemonicKey, m) }
        mnemonic(): string {
                const mn = sessionStorage.getItem(mnemonicKey)
                return mn === null ? "" : mn
        }

        disconnect() {
                sessionStorage.setItem(walletPreferenceKey, '')
                sessionStorage.setItem(acctPreferenceKey, '')
                sessionStorage.setItem(acctListKey, '')
                sessionStorage.setItem(mnemonicKey, '')
        }

        getDefaultAccount(): string {
                if (!this.connected()) return ""
                return this.wallet.getDefaultAccount()
        }

        async signTxn(txns: Transaction[]): Promise<SignedTxn[]> {
                if (!this.connected()) return []
                return this.wallet.signTxn(txns)
        }

}
