import dotenv from 'dotenv';
dotenv.config();
import cron from 'node-cron';
import _ from 'lodash';
import { run as RunerV2, DropReboundPeriod } from '../model-2';
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

    try {
        if (!symbol.toUpperCase().includes('USDT')) {
            symbol = symbol + 'USDT';
        }
        if (!date) {
            date = moment.utc().format('YYYY-MM-DD');
        }
        const reuslt = await RunerV2(symbol, maxDayToCheck, date);
        await interaction.reply(`processing ${symbol} with ${maxDayToCheck} days window at ${date}`);
        if (reuslt?.length) {
            const channel = interaction.channel;

            const thread = await (channel as TextChannel).threads.create({
                name: `${symbol} from ${moment.utc(date).subtract(maxDayToCheck, 'd').format('YYYY-MM-DD')} to ${date}`,
            })
            await sendResultToThread(reuslt, thread);

            await interaction.editReply(`${symbol} with ${maxDayToCheck} days window at ${date} Found ${reuslt.length} records`);
        } else {
            await interaction.editReply(`${symbol} with ${maxDayToCheck} days window at ${date} Found nothing`);

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
    // { symbol: 'BTCUSDT', maxDayToCheck: 30 },
    // { symbol: 'ETHUSDT', maxDayToCheck: 30 },
    { symbol: 'BTCUSDT', maxDayToCheck: 60 },
    { symbol: 'ETHUSDT', maxDayToCheck: 60 },
]
//'0 9,12,18,21 * * *'
//run every 2 min

cron.schedule('0 */1 * * *', () => {
    (async () => {

        console.log('running a task every day at 9am, 12pm and 6pm');

        const channel = await discordClient.channels.fetch(`${process.env.DISCORD_CRYPTO_CHANNEL_ID}`)
        if (!channel) {
            console.error('Channel not found');
            return;
        }
        const textChannel = channel as TextChannel;

        console.log('channel found');
        for (const config of cronJobConfig) {

            console.log(`processing ${config.symbol} with ${config.maxDayToCheck} days window at ${moment.utc().format('YYYY-MM-DD')}`);
            const reuslt = await RunerV2(config.symbol, config.maxDayToCheck, moment.utc().format('YYYY-MM-DD'));

            if (reuslt?.length) {
                //create thread
                const thread = await textChannel.threads.create({
                    name: `${config.symbol} from ${moment.utc().subtract(config.maxDayToCheck, 'd').format('YYYY-MM-DD')} to ${moment.utc().format('YYYY-MM-DD')}`,
                })

                sendResultToThread(reuslt, thread);
            } else {
                await textChannel.send(`${config.symbol} with ${config.maxDayToCheck} days window at ${moment.utc().format('YYYY-MM-DD')} Found nothing`);
            }
            console.log(`processing ${config.symbol} with ${config.maxDayToCheck} days window at ${moment.utc().format('YYYY-MM-DD')} done`);

        }
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

async function sendResultToThread(result: DropReboundPeriod[], thread: ThreadChannel) {

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
