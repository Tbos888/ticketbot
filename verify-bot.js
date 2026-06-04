const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Partials,
    REST,
    Routes
} = require('discord.js');

// ========================================================
// 🌐 เพิ่มระบบจำลอง Web Server ขนาดเล็ก เพื่อรองรับพอร์ตของ Render.com
// ========================================================
const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000; // ใช้พอร์ตจาก Render หรือเลือกพอร์ต 10000 เป็นค่าเริ่มต้น

app.get('/', (req, res) => {
    res.send('FLEXDAS VERIFY BOT IS ONLINE!');
});

app.listen(PORT, () => {
    console.log(`Web Server is running on port ${PORT}`);
});
// ========================================================

// สร้าง Client แยกเฉพาะของบอทตัวที่ 2
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.GuildMember]
});

// ========================================================
// ⚙️ ตั้งค่าความปลอดภัยและไอดีระบบของบอทตัวที่ 2 (บอทยืนยันตัวตน)
// ========================================================
const TOKEN = process.env.VERIFY_BOT_TOKEN;   // ดึงค่าอย่างปลอดภัยจากระบบหลังบ้าน Render
const ROLE_ID = "1506712792722440203";         // ID ยศ Member ของคุณ
const LOG_CHANNEL_ID = "1510475926591242390";  // ID ห้อง Log แอดมินของคุณ
const MIN_ACCOUNT_AGE_DAYS = 7;               // ป้องกันสแปมจากไอดีสมัครใหม่น้อยกว่า 7 วัน (ใส่ 0 เพื่อปิดระบบนี้)
const BANNER_IMAGE_URL = "https://cdn.discordapp.com/attachments/1510475926591242390/1510490934465265857/ChatGPT_Image_May_30_2026_07_32_07_AM.png?ex=6a219f0e&is=6a204d8e&hm=8467f71de43508f0aa4cd7b42566c2c06d6f67eb7422859541e8783b8c8b4e94&";
// ========================================================

client.on('ready', async () => {
    console.log(`=========================================`);
    console.log(` PREMIUM BOT (JS) : ${client.user.tag} ONLINE`);
    console.log(`=========================================`);

    const commands = [
        {
            name: 'setup_verify',
            description: 'สร้างหน้าจอยืนยันตัวตนสไตล์พรีเมียม มินิมอล'
        }
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('ซิงก์ระบบคำสั่งบอทยืนยันตัวตนสำเร็จ!');
    } catch (error) {
        console.error('Error syncing verify commands:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    
    // 1. ตรวจจับ Slash Command: /setup_verify
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup_verify') {
            
            if (!interaction.member.permissions.has('Administrator')) {
                return interaction.reply({ content: "❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้", ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle("SECURITY VERIFICATION")
                .setDescription(
                    "**WELCOME TO THE SERVER**\n" +
                    "Please complete the verification process to gain full access to the server. " +
                    "This protocol is designed to protect our community from automated spam and security threats.\n\n" +
                    "**GUIDELINES**\n" +
                    "• Click the verification button below to initiate.\n" +
                    "• Brand new or unestablished accounts may be restricted.\n" +
                    "• If you encounter issues, please contact Tbos."
                )
                .setColor(0x2b2d31)
                .setFooter({ text: "FLEXDAS SECURITY SYSTEM" });

            if (BANNER_IMAGE_URL) {
                embed.setImage(BANNER_IMAGE_URL);
            }

            const button = new ButtonBuilder()
                .setCustomId('premium_verify_btn_final')
                .setLabel('ยืนยันตัวตน (Verify)')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder().addComponents(button);

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: "สร้างแผงยืนยันตัวตนแบบพรีเมียมมินิมอลเรียบร้อยแล้ว!" });
        }
    }

    // 2. ตรวจจับเมื่อผู้ใช้กดยืนยันตัวตน
    if (interaction.isButton()) {
        if (interaction.customId === 'premium_verify_btn_final') {
            
            await interaction.deferReply({ ephemeral: true });

            const member = interaction.member;
            const guild = interaction.guild;

            const createdAt = member.user.createdAt;
            const now = new Date();
            const diffTime = Math.abs(now - createdAt);
            const accountAge = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (accountAge < MIN_ACCOUNT_AGE_DAYS) {
                await interaction.editReply({
                    content: `❌ **ขออภัย บัญชีของคุณไม่ผ่านเงื่อนไขความปลอดภัย**\n• เซิร์ฟเวอร์นี้อนุญาตเฉพาะบัญชีที่มีอายุมากกว่า \`${MIN_ACCOUNT_AGE_DAYS}\` วันขึ้นไป เพื่อป้องกันระบบสแปม\n• บัญชีของคุณมีอายุ: \`${accountAge}\` วัน`
                });

                const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    const embedBlock = new EmbedBuilder()
                        .setTitle("⚠️ ตรวจพบไอดีต้องสงสัย (Anti-Alt Blocked)")
                        .setDescription("ระบบได้ทำการบล็อกการยืนยันตัวตนเนื่องจากอายุบัญชีน้อยกว่ากำหนด")
                        .setColor(0xff0000)
                        .setThumbnail(member.user.displayAvatarURL())
                        .addFields(
                            { name: "ผู้ใช้", value: `${member} (${member.user.username})`, inline: true },
                            { name: "ไอดีผู้ใช้", value: `\`${member.id}\``, inline: true },
                            { name: "อายุบัญชี", value: `\`${accountAge}\` วัน`, inline: false }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [embedBlock] });
                }
                return;
            }

            const role = guild.roles.cache.get(ROLE_ID);
            if (!role) {
                return interaction.editReply({ content: "❌ ไม่พบบทบาทในระบบ กรุณาติดต่อผู้ดูแลเซิร์ฟเวอร์" });
            }

            if (member.roles.cache.has(ROLE_ID)) {
                return interaction.editReply({ content: "คุณยืนยันตัวตนเสร็จสิ้นไปแล้วครับ!" });
            }

            try {
                await member.roles.add(role);
                await interaction.editReply({
                    content: `🎉 **ยืนยันตัวตนสมบูรณ์**\n• ยินดีต้อนรับเข้าสู่เซิร์ฟเวอร์อย่างเป็นทางการ\n• คุณได้รับยศ: ${role} แล้ว ขอให้สนุกกับการร่วมแชทครับ`
                });

                const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    const embedSuccess = new EmbedBuilder()
                        .setTitle("💚 ยืนยันตัวตนสำเร็จ (Verified)")
                        .setDescription("ผู้ใช้งานกดยืนยันตัวตนเข้าสู่เซิร์ฟเวอร์เรียบร้อยแล้ว")
                        .setColor(0x00ff00)
                        .setThumbnail(member.user.displayAvatarURL())
                        .addFields(
                            { name: "ผู้ใช้", value: `${member} (${member.user.username})`, inline: true },
                            { name: "ไอดีผู้ใช้", value: `\`${member.id}\``, inline: true },
                            { name: "อายุบัญชีขณะเข้า", value: `\`${accountAge}\` วัน`, inline: false }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [embedSuccess] });
                }
            } catch (error) {
                console.error(error);
                await interaction.editReply({ content: "❌ บอทไม่มีสิทธิ์ให้ยศนี้ กรุณาตรวจสอบว่ายศของบอทอยู่สูงกว่ายศที่กำลังแจกในเซิร์ฟเวอร์" });
            }
        }
    }
});

// สั่งเข้าสู่ระบบบอทตัวที่ 2
client.login(TOKEN);
