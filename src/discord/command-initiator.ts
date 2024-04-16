import 'dotenv';
import { SlashCommandBuilder } from '@discordjs/builders';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9'
const guildId = `${process.env.DISCORD_GUILD_ID}`;
const appId = `${process.env.DISCORD_APP_ID}`;
const botToken = `${process.env.DISCORD_BOT_TOKEN}`;

export async function createCommand() {
    const rest = new REST({ version: '9' }).setToken(botToken);


    await rest.get(Routes.applicationGuildCommands(appId, guildId))
        .then((commands: any) => {
            const promises = [];
            for (const command of commands) {
                const deleteUrl = Routes.applicationGuildCommand(appId, guildId, command.id);
                promises.push(rest.delete(deleteUrl));
            }
            return Promise.all(promises);
        })
        .then(() => console.log('Successfully deleted test commands in the guild.'))
        .catch(console.error);


    const commands = [
        new SlashCommandBuilder()
            .setName('evaluate')
            .setDescription('Summarizes the content at the given URL')
            .addStringOption(option =>
                option.setName('symbol').setDescription('Crypto Symbol from binance').setRequired(true)
            )
            .addStringOption(option =>
                option.setName('date').setDescription('Date (YYYY-MM-DD)').setRequired(true)
            )
            .addNumberOption(option => 
                option.setName('window').setDescription('Max day to check').setRequired(true)
            )
            
    ]
        .map(command => command.toJSON());



    try {
        await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: commands })
        console.log('Successfully registered application commands.')

    } catch (error) {
        console.error(error)
    }



}