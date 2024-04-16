import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import _ from 'lodash';
import { run } from '../runner-v2';
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


    const symbol = interaction.options.get('symbol')?.value as string;
    const maxDayToCheck = interaction.options.get('window')?.value as number;
    const date = interaction.options.get('date')?.value as string;
    if (!symbol || !maxDayToCheck) {
        await interaction.reply('Please provide both symbol and window');
        return;
    }

    try {
        const reuslt = await run(symbol, maxDayToCheck, date);
        await interaction.reply(`processing ${symbol} with ${maxDayToCheck} days window at ${date}`);
        if (reuslt?.length) {
            const channel = interaction.channel;

            const thread = await (channel as TextChannel).threads.create({
                name: `${symbol} @ ${maxDayToCheck} / ${date}d `,
                autoArchiveDuration: 4320,
            })
            for (const r of reuslt) {
                await thread.send(`由__${dateFormater(r.leftSideStart)}__至__${dateFormater(r.leftSideEnd)}__跌，最高價格為__${r.leftSideHighestPrice}__，由__${dateFormater(r.rightSideStart)}__至__${dateFormater(r.rightSideEnd)}__回升至__${r.rightSideHighestPrice}__`);
            }
            //    reuslt.forEach((r) => {
            //     return `Left Side: ${r.leftSideStart} - ${r.leftSideEnd} Highest Price: ${r.leftSideHighestPrice} vs Right Side: ${r.rightSideStart} - ${r.rightSideEnd} Highest Price: ${r.rightSideHighestPrice}`
            // })

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
