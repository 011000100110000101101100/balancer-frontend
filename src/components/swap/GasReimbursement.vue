<template>
    <div class="container">
        <div>
            <Icon
                class="message-icon"
                :title="'brand'"
            />
        </div>

        <div>
            <span class="message-title">
                High gas fees? We'll refund you!<br>
            </span>
            <span class="message-body">
                {{ messageGasReimbursed }}
            </span>
        </div>
    </div>
</template>

<script lang="ts">

// TODO: cleanup
import { ref, PropType, defineComponent, watch, computed } from 'vue';
import { useStore } from 'vuex';
import { Swap, Pool } from '@balancer-labs/sor/dist/types';
import { RootState } from '@/store';
import LoadingIndicator from '@/components/LoadingIndicator.vue';
import BigNumber from 'bignumber.js';
import Icon from '@/components/Icon.vue';
import Helper from '@/web3/helper';
import { getTokenPriceUSD, getBALETHSpotPrice } from '@/utils/helpers';

// TODO: eligibility list:
import eligibletokenlist from '@balancer-labs/assets/lists/eligible.json';

export default defineComponent({
    components: {
        LoadingIndicator,
        Icon,
    },
    props: {
        swaps: {
            type: Array as PropType<Swap[][]>,
            required: true,
        },
        pools: {
            type: Array as PropType<Pool[]>,
            required: true,
        },
        active: {
            type: Boolean,
            required: false,
            default: true,
        },
        rewardModifier: {
            type: Number,
            required: false,
            default: 100,
        },
    },

    setup(props) {
        const store = useStore<RootState>();
        const balReimburseAmount = ref('');
        const balReimburseAmountUSD = ref('');
        const loading = ref(true);

        watch(() => props, async (props) => {
            loading.value = true;

            // TODO: optimizations: store, call freq, fallback, format(), cache - (gas, price, spot, props)
            try {
                const poolAddress = '0x59a19d8c652fa0284f44113d0ff9aba70bd46fb4'; // TODO: extract for other pools/networks
                const flattenedSwaps = props.swaps.flat();
                const balWethPool = props.pools.find(pool => pool.id === poolAddress);

                if (balWethPool) {
                    // get gas limit based on swaps
                    const numSwaps = flattenedSwaps.length;
                    const gasLimitGwei =    new BigNumber((numSwaps === 1 ? 130000 :
                                                            numSwaps === 2 ? 220000 :
                                                            numSwaps === 3 ? 300000 :
                                                            numSwaps >= 4 ? 400000 : 0));
                    // get gas price, total
                    const provider = await store.getters['account/provider'];
                    const gasPriceGwei = new BigNumber(await Helper.getGasPrice(provider));
                    const gasPriceETH = new BigNumber(gasLimitGwei).times(gasPriceGwei).div(1e9);

                    // calc BAL reimbursement amt
                    const balEthSpotPrice = getBALETHSpotPrice(balWethPool);
                    const balAmount = gasPriceETH.div(balEthSpotPrice);
                    balReimburseAmount.value = balAmount.toFixed(2);

                    // get $gas $bal
                    const wethPriceUSD = await getTokenPriceUSD('weth');
                    const gasPriceUSD = new BigNumber(wethPriceUSD).times(gasPriceETH);
                    balReimburseAmountUSD.value = gasPriceUSD.toFixed(2);

                    // TODO: debug
                    console.log('GasReimbursement.vue: watch(props): Calculation Info:',
                        'gasLimitGwei:', gasLimitGwei.toNumber(),
                        'gasPriceGwei:', gasPriceGwei.toNumber(),
                        'gasPriceETH:', gasPriceETH.toFixed(6),
                        'balEthSpotPrice:', balEthSpotPrice.toFixed(6),
                        'balAmount:', balAmount.toFixed(6),
                        'gasPriceUSD:', gasPriceUSD.toFixed(2),
                        'balReimburseAmount:', balReimburseAmount.value,
                        'balReimburseAmountUSD.value:', balReimburseAmountUSD.value);
                }
            } catch(e) {
                console.error('error calculating estimate: ', e);
                balReimburseAmount.value = '';
                balReimburseAmountUSD.value = '';
            }
            loading.value = false;
        },
        {
            deep: true,
            immediate: true,
        },
        );

        const messageGasReimbursed = computed(() => {
            const defaultMessage = 'Earn BAL when swapping eligible tokens!';
            try {
                return loading.value ||
                       (!balReimburseAmount.value || balReimburseAmount.value) === '0' ||
                       (!balReimburseAmountUSD.value || balReimburseAmountUSD.value === '0') ?
                    defaultMessage :
                    `This trade will earn you up to  ${balReimburseAmount.value}BAL (${formatUSD(balReimburseAmountUSD.value)})`;
            } catch (e) {
                console.error('error calculating estimate: ', e);
                return defaultMessage;
            }
        });

        function formatUSD(amount: any): string {
            return `$${new BigNumber(amount).toFixed(2)}`; // TODO: check NaN
        }

        return {
            loading,
            messageGasReimbursed,
        };
    },
});
</script>

// TODO: cleanup and test style-css-design, flex, crossXbrowser, mobile, pwa, resize, color
// TODO: defaults, placeholder, fallback, loader, suspense¿
// TODO: prevent POP from load / show fee message / temp removed loading indicator
<style scoped>

.container {
    display: flex;
    align-items: center;
    background:
     linear-gradient(var(--background-secondary), var(--background-secondary)) padding-box,
     linear-gradient(185deg, #f0f 0%, #00f 100%) border-box;
    border-radius: var(--border-radius-medium);
    margin-top: 40px;
    width: 385px;
    padding: 10px;
    border: 3px solid transparent;
    font-size: var(--font-size-small);
    color: var(--text-secondary);
}

.message-title {
    font-weight: bold;
    color: var(--text-primary);
}

.message-body {
    font-size: var(--font-size-small);
    color: var(--text-secondary);
    cursor: pointer;
}

.message-icon {
    width: 32px;
    height: 32px;
    margin: 10px 10px;
}

.container-loading {
    display: flex;
    align-items: center;
    margin-top: 40px;
    width: 385px;
    padding: 10px;
    border: 3px solid transparent;
    font-size: var(--font-size-small);
    color: var(--text-secondary);
    justify-content: center;
}
</style>
