require('dotenv').config();

const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('panel')
        .setDescription('เปิด Marketplace Panel'),

    new SlashCommandBuilder()
        .setName('sell')
        .setDescription('ลงขายไอดี')
        .addStringOption(option =>
            option
                .setName('game')
                .setDescription('ชื่อเกม')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('price')
                .setDescription('ราคา')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('detail')
                .setDescription('รายละเอียด')
                .setRequired(true)
        )
        .addAttachmentOption(option =>
            option
                .setName('image')
                .setDescription('รูปสินค้า')
                .setRequired(false)
        )
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    try {

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log('✅ Commands Registered');

    } catch (err) {
        console.error(err);
    }
})();