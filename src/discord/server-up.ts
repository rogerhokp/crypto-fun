import dotenv from 'dotenv';
dotenv.config();
import cron from 'node-cron';
import _ from 'lodash';
import { run as RunerV2 } from '../runner-v2';
import moment from 'moment';

import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
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

    CommandInitiator.createCommand();
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
            date = moment().format('YYYY-MM-DD');
        }
        const reuslt = await RunerV2(symbol, maxDayToCheck, date);
        await interaction.reply(`processing ${symbol} with ${maxDayToCheck} days window at ${date}`);
        if (reuslt?.length) {
            const channel = interaction.channel;

            const thread = await (channel as TextChannel).threads.create({
                name: `${symbol} @ ${maxDayToCheck}d / ${date} `,
                autoArchiveDuration: 4320,
            })
            let idx = 1;
            for (const r of reuslt) {
                const leftSideDays = moment(r.leftSideEnd).diff(moment(r.leftSideStart), 'days');
                const rightSideDays = moment(r.rightSideEnd).diff(moment(r.rightSideStart), 'days');
                await thread.send(
                    `${idx} : 
**${dateFormater(r.leftSideStart)}**至**${dateFormater(r.leftSideEnd)}** （${leftSideDays})天
    💵 **${r.leftSideHighestPrice}** 跌到 **${r.leftSideLowestPrice}**
    **${dateFormater(r.rightSideEnd)}** 之後反彈到 💵 **${r.rightSideHighestPrice}** (${rightSideDays})天
`);
                idx++;
            }

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
    return moment(date).format('YYYY-MM-DD');
}

// Make the client login
discordClient.login(`${process.env.DISCORD_BOT_TOKEN}`);


const cronJobConfig = [
    { symbol: 'BTCUSDT', maxDayToCheck: 30 },
    { symbol: 'ETHUSDT', maxDayToCheck: 30 },
]
cron.schedule('0 9,12,18 * * *', async () => {

    console.log('running a task every day at 9am, 12pm and 6pm');

    const channel = await discordClient.channels.fetch(`${process.env.DISCORD_CRYPTO_CHANNEL_ID}`)
    if (!channel) {
        console.error('Channel not found');
        return;
    }
    const textChannel = channel as TextChannel;

    for (const config of cronJobConfig) {

        const reuslt = await RunerV2(config.symbol, config.maxDayToCheck);

        if (reuslt?.length) {
            //create thread
            const thread = await textChannel.threads.create({
                name: `${config.symbol} in ${config.maxDayToCheck}d @ ${moment().format('YYYY-MM-DD')}`,
                autoArchiveDuration: 1440,
            })

            let idx = 1;
            for (const r of reuslt) {
                const leftSideDays = moment(r.leftSideEnd).diff(moment(r.leftSideStart), 'days');
                const rightSideDays = moment(r.rightSideEnd).diff(moment(r.rightSideStart), 'days');
                await thread.send(
                    `${idx} : 
**${dateFormater(r.leftSideStart)}**至**${dateFormater(r.leftSideEnd)}** （${leftSideDays})天
    💵 **${r.leftSideHighestPrice}** 跌到 **${r.leftSideLowestPrice}**
    **${dateFormater(r.rightSideEnd)}** 之後反彈到 💵 **${r.rightSideHighestPrice}** (${rightSideDays})天
`);
                idx++;
            }

        } else {
            await textChannel.send(`${config.symbol} with ${config.maxDayToCheck} days window at ${moment().format('YYYY-MM-DD')} Found nothing`);

        }

    }


}, {
    scheduled: true,
    timezone: "asia/hong_kong"
});
console.log('Cron job is running');