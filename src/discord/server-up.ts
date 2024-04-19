import dotenv from 'dotenv';
dotenv.config();
import cron from 'node-cron';
import _ from 'lodash';
import { run as modelRun, DropReboundPeriod } from '../model-2';
import moment from 'moment';

import { Client, GatewayIntentBits, TextChannel, ThreadChannel } from 'discord.js';
import * as CommandInitiator from './command-initiator';

const discordClient = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent,
    ],
});


discordClient.once('ready', () => {

    // CommandInitiator.createCommand();
    console.log('Discord bot is ready!');
});


discordClient.on('interactionCreate', async (interaction) => {

    console.log('interaction received');
    if (!interaction.isCommand()) return;
    if (interaction.channel?.isThread()) {
        console.log('Thread command received!!');
        return;
    }
    const { commandName } = interaction;

    const user = interaction.user;
    if (commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (commandName === 'beep') {
        await interaction.reply('Boop!');
    }


    let symbol = interaction.options.get('symbol')?.value as string;
    const maxDayToCheck = interaction.options.get('window')?.value as number;
    let date = interaction.options.get('date')?.value as string || undefined;
    if (!symbol || !maxDayToCheck) {
        await interaction.reply('Please provide both symbol and window');
        return;
    }
    const isPrediction = interaction.options.get('prediction')?.value as boolean || false;

    try {
        if (!symbol.toUpperCase().includes('USDT')) {
            symbol = symbol + 'USDT';
        }
        if (!date) {
            date = moment.utc().format('YYYY-MM-DD');
        }
        const reuslt = await modelRun(symbol, maxDayToCheck, date, isPrediction);
        await interaction.reply(`processing ${symbol} with ${maxDayToCheck} days window at ${date}`);
        if (reuslt?.length) {
            const channel = interaction.channel;

            const thread = await (channel as TextChannel).threads.create({
                name: `Evaluation: ${symbol} / ${date} / ${maxDayToCheck}d / ${isPrediction ? 'Prediction' : 'Real'}`,
            })
            await sendResultToThread(reuslt, thread);

            await interaction.editReply(`Evaluation: ${symbol} / ${date} / ${maxDayToCheck}d / ${isPrediction ? 'Prediction' : 'Real'}. Found ${reuslt.length} records`);
        } else {
            await interaction.editReply(`Evaluation: ${symbol} / ${date} / ${maxDayToCheck}d / ${isPrediction ? 'Prediction' : 'Real'}. Found nothing`);

        }
    } catch (e) {
        console.error(e);
        await interaction.reply('An error occurred : ' + (e as Error).message);
    }



});


const dateFormater = (date: Date) => {
    return moment.utc(date).format('YYYY-MM-DD');
}

// Make the client login
discordClient.login(`${process.env.DISCORD_BOT_TOKEN}`);


const cronJobConfig = [
    { symbol: 'BTCUSDT', maxDayToCheck: 60 },
    { symbol: 'ETHUSDT', maxDayToCheck: 60 },
    { symbol: 'TIAUSDT', maxDayToCheck: 60 },
    { symbol: 'BTCUSDT', maxDayToCheck: 60, isPrediction: true },
    { symbol: 'ETHUSDT', maxDayToCheck: 60, isPrediction: true },
]
//'0 9,12,18,21 * * *'
//run every 2 min

cron.schedule('0 */3 * * *', () => {
    (async () => {

        console.log('Cron job Start');
        const channel = await discordClient.channels.fetch(`${process.env.DISCORD_CRYPTO_CHANNEL_ID}`)
        if (!channel) {
            console.error('Channel not found');
            return;
        }
        const textChannel = channel as TextChannel;

        for (const config of cronJobConfig) {
            const isPrediction = config.isPrediction || false;
            console.log(`processing ${config.symbol} with ${config.maxDayToCheck} days window at ${moment.utc().format('YYYY-MM-DD')}`);
            const reuslt = await modelRun(config.symbol, config.maxDayToCheck, moment.utc().format('YYYY-MM-DD'), isPrediction);

            if (reuslt?.length) {
                //create thread
                const thread = await textChannel.threads.create({
                    name: `🔔 ${config.symbol} / ${moment.utc().format('YYYY-MM-DD')} / ${config.maxDayToCheck}d / ${isPrediction ? 'Prediction' : 'Real'}`,
                })

                sendResultToThread(reuslt, thread);
            } else {
                await textChannel.send(`${config.symbol} / ${moment.utc().format('YYYY-MM-DD')} / ${config.maxDayToCheck}d / ${isPrediction ? 'Prediction' : 'Real'} found nothing`);
            }
            console.log(`processing ${config.symbol} with ${config.maxDayToCheck} days window at ${moment.utc().format('YYYY-MM-DD')} done`);

        }





        console.log('Cron job End');
    })();

}, {
    scheduled: true,
    timezone: "asia/hong_kong"
});
console.log('Cron job is running');

const ReasonTxtMap = {
    'SMALLEST_RANGE': '最近的v型',
    'LARGEST_RANGE': '最大的v型',
} as { [reason: string]: string }

async function sendResultToThread(result: DropReboundPeriod[], thread: ThreadChannel, isPrediction: boolean = false) {

    const minRightDays = _.min(result.map((o) => moment.utc(o.rightSideEnd).diff(moment.utc(o.rightSideStart), 'days')));
    const minRights = _.filter(result, (o) => moment.utc(o.rightSideEnd).diff(moment.utc(o.rightSideStart), 'days') === minRightDays);
    const smallestRange = _.minBy(
        minRights,
        (o) => moment.utc(o.leftSideEnd).diff(moment.utc(o.leftSideStart), 'days')//find the smallest left side
    );
    const ranges = {
        "SMALLEST_RANGE": smallestRange,
    } as { [reason: string]: DropReboundPeriod };

    const largestDays = _.max(result.map((o) => moment.utc(o.rightSideEnd).diff(moment.utc(o.leftSideStart), 'days')));
    const largestDaysRanges = _.groupBy(result, (o) => moment.utc(o.rightSideEnd).diff(moment.utc(o.leftSideStart), 'days'));
    console.log('largestDaysRanges', JSON.stringify(largestDaysRanges, null, 2));
    console.log('largestDays', largestDays);
    const largestRange = _.minBy(
        _.filter(result, (o) => moment.utc(o.rightSideEnd).diff(moment.utc(o.leftSideStart), 'days') === largestDays),
        (o) => moment.utc(o.rightSideEnd).diff(moment.utc(o.rightSideStart), 'days')//find the smallest left side
    );
    if (largestRange) {
        ranges["LARGEST_RANGE"] = largestRange;
    }


    for (const reason of Object.keys(ranges)) {
        const reasonText = ReasonTxtMap[reason];
        const r = ranges[reason];
        if (!r) {
            await thread.send(`No ${reasonText} found`);
            continue;
        }
        const leftSideDays = moment.utc(r.leftSideEnd).diff(moment.utc(r.leftSideStart), 'days');
        const rightSideDays = moment.utc(r.rightSideEnd).diff(moment.utc(r.rightSideStart), 'days');
        await thread.send(
            `**${reasonText}** : 
**${leftSideDays}**日 由 **${dateFormater(r.leftSideStart)}** 至 **${dateFormater(r.leftSideEnd)}** , 💵**${r.leftSideHighestPrice}** 插到 💵**${r.leftSideLowestPrice}**
**${rightSideDays}**日 日上返 💵**${r.settlementPrice}**`);
    }


}
