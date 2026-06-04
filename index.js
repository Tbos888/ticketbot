const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Partials,
    REST,
    Routes,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

// สร้าง Client ของบอทหลัก (บอทระบบตั๋ว FlexDas)
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
// ⚙️ ตั้งค่าความปลอดภัยและไอดีระบบของบอทตั๋วหลัก
// ========================================================
const TOKEN = process.env.TOKEN;                 // ดึง Token บอทตั๋วหลักจากระบบหลังบ้าน Render (ช่อง TOKEN)
const CATEGORY_ID = "ใส่_ID_หมวดหมู่ตั๋วตรงนี้";    // (ไม่ใส่ก็ได้) ID หมวดหมู่ (Category) ที่อยากให้ห้องตั๋วไปสร้างอยู่ข้างใน
const STAFF_ROLE_ID = "ใส่_ID_ยศแอดมินหรือทีมงาน";   // (ไม่ใส่ก็ได้) ID ยศของทีมงานที่จะให้มองเห็นและร่วมแชทในช่องตั๋วได้
// ========================================================

client.on('ready', async () => {
    console.log(`=========================================`);
    console.log(` TICKET BOT (JS) : ${client.user.tag} ONLINE`);
    console.log(`=========================================`);

    // ลงทะเบียนสแลชคำสั่ง /panel เข้าสู่ดิสคอร์ด
    const commands = [
        {
            name: 'panel',
            description: 'สร้างแผงควบคุมตั๋วบริการหลักสไตล์พรีเมียม (FlexDas Panel)'
        }
    ];

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands }
        );
        console.log('ซิงก์ระบบคำสั่งบอทตั๋วสำเร็จ!');
    } catch (error) {
        console.error('Error syncing ticket commands:', error);
    }
});

client.on('interactionCreate', async (interaction) => {
    
    // 1. ตรวจจับคำสั่ง Slash Command: /panel เพื่อส่งแผงควบคุมหลัก
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'panel') {
            // เช็คว่าผู้ใช้คำสั่งเป็นผู้ดูแลระบบหรือไม่
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: "❌ คุณไม่มีสิทธิ์ใช้งานคำสั่งนี้", ephemeral: true });
            }

            await interaction.deferReply({ ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle("FLEXDAS INTERACTIVE PANEL")
                .setDescription(
                    "**🤍 Welcome to FlexDas Terminal**\n\n" +
                    "ยินดีต้อนรับเข้าสู่แผงควบคุมหลักบริการของ **FlexDas**\n" +
                    "โปรดทำรายการผ่านแบบฟอร์มปุ่มกดด้านล่างนี้ได้ทันทีครับ\n\n" +
                    "⚙️ **แผนกบริการหลัก**\n" +
                    "🛒 **สั่งทำบริการและจัดซื้อไอดี (Buy Service)**\n" +
                    "แฟ้มสั่งทำเว็บไซต์ ระบบฐานข้อมูล และเลือกซื้อไอดีเกมต่าง ๆ\n\n" +
                    "💰 **เสนอขายสินค้ากับแบรนด์ (Sell to Us)**\n" +
                    "ส่งข้อมูลประวัติและเงื่อนไขไอดีเกมที่ต้องการขายให้กับทางเรา\n\n" +
                    "🛠️ **แจ้งปัญหา / คำขอพิเศษ (Help Center)**\n" +
                    "แผนกรับเรื่องบั๊ก เคลมประกัน หรือพูดคุยโดยตรงกับฝ่ายเทคนิค\n\n" +
                    "───────────────────────────────────"
                )
                .setColor(0x2b2d31)
                .setFooter({ text: "Monochrome Interactive System • FlexDas • 02/06/2026 22:41" });

            // สร้างปุ่มกดทั้ง 3 ปุ่มตรงตามต้นฉบับเก่าของคุณ
            const btnBuy = new ButtonBuilder()
                .setCustomId('ticket_buy')
                .setLabel('🛒 สั่งบริการ/ซื้อ ID')
                .setStyle(ButtonStyle.Secondary);

            const btnSell = new ButtonBuilder()
                .setCustomId('ticket_sell')
                .setLabel('💰 เสนอขายไอดี')
                .setStyle(ButtonStyle.Secondary);

            const btnHelp = new ButtonBuilder()
                .setCustomId('ticket_help')
                .setLabel('🛠️ แจ้งเรื่องช่วยเหลือ')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(btnBuy, btnSell, btnHelp);

            await interaction.channel.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: "สร้างแผงควบคุมตั๋วบริการหลักเรียบร้อยแล้ว!" });
        }
    }

    // 2. ตรวจจับการกดปุ่มสร้างตั๋วทั้ง 3 ปุ่ม
    if (interaction.isButton()) {
        const customId = interaction.customId;
        const guild = interaction.guild;
        const user = interaction.user;

        if (['ticket_buy', 'ticket_sell', 'ticket_help'].includes(customId)) {
            await interaction.deferReply({ ephemeral: true });

            let channelName = '';
            let welcomeTitle = '';
            let welcomeDesc = '';

            // กำหนดข้อมูลแชนเนลตั๋วตามปุ่มที่กดใช้งาน
            if (customId === 'ticket_buy') {
                channelName = `🛒-buy-${user.username}`;
                welcomeTitle = "🛒 แผนกสั่งซื้อและจัดทำบริการ (Buy Service)";
                welcomeDesc = "ยินดีต้อนรับเข้าสู่ช่องสั่งทำบริการจัดซื้อและทำเว็บไซต์ครับ โปรดพิมพ์ระบุรายละเอียดงานหรือไอดีที่คุณต้องการทิ้งไว้ได้เลยครับ ทีมงานจะรีบเข้ามาตรวจสอบโดยเร็วที่สุด";
            } else if (customId === 'ticket_sell') {
                channelName = `💰-sell-${user.username}`;
                welcomeTitle = "💰 แผนกเสนอขายสินค้ากับแบรนด์ (Sell to Us)";
                welcomeDesc = "ยินดีต้อนรับเข้าสู่ช่องเสนอขายไอดีและสินค้าครับ โปรดส่งข้อมูลประวัติ รูปภาพราคา และเงื่อนไขต่าง ๆ ทิ้งไว้ในช่องนี้ได้เลยครับ";
            } else if (customId === 'ticket_help') {
                channelName = `🛠️-support-${user.username}`;
                welcomeTitle = "🛠️ แผนกแจ้งปัญหา / คำขอพิเศษ (Help Center)";
                welcomeDesc = "แผนกรับเรื่องบั๊ก เคลมประกัน และฝ่ายเทคนิคครับ โปรดพิมพ์แจ้งรายละเอียดปัญหาของคุณ หรือคำขอพิเศษที่ต้องการพูดคุยกับทีมงานทิ้งไว้ได้ทันทีครับ";
            }

            // ตรวจสอบว่ามีช่องตั๋วเปิดซ้ำหรือไม่
            const existingChannel = guild.channels.cache.find(c => c.name === channelName.toLowerCase());
            if (existingChannel) {
                return interaction.editReply({ content: `❌ คุณมีช่องตั๋วเดิมเปิดค้างไว้เรียบร้อยแล้วครับ: ${existingChannel}` });
            }

            // ตั้งค่าสิทธิ์การเข้าถึงช่องตั๋ว (แอดมิน, บอท และผู้กดสร้างเท่านั้นที่เห็น)
            const permissionOverwrites = [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }
            ];

            // เพิ่มยศทีมงานแอดมินเข้าไปในสิทธิ์การมองเห็น (ถ้ากรอกค่าไว้)
            if (STAFF_ROLE_ID && guild.roles.cache.has(STAFF_ROLE_ID)) {
                permissionOverwrites.push({
                    id: STAFF_ROLE_ID,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                });
            }

            try {
                // สร้างช่องแชทตั๋วใหม่แบบ Text Channel
                const ticketChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: guild.channels.cache.has(CATEGORY_ID) ? CATEGORY_ID : null,
                    permissionOverwrites: permissionOverwrites
                });

                // ส่งข้อความแจ้งเตือนต้อนรับและปุ่มกดในช่องตั๋วใหม่
                const welcomeEmbed = new EmbedBuilder()
                    .setTitle(welcomeTitle)
                    .setDescription(
                        `${welcomeDesc}\n\n` +
                        `• **ผู้เปิดตั๋ว:** ${user}\n` +
                        `• **คำแนะนำ:** พิมพ์รายละเอียดทิ้งไว้แล้วรอทีมงานสักครู่ครับ`
                    )
                    .setColor(0x2b2d31)
                    .setFooter({ text: "FLEXDAS TICKET SYSTEM" });

                // ปุ่มกดสำหรับปิดแชทตั๋ว
                const btnClose = new ButtonBuilder()
                    .setCustomId('ticket_close_confirm')
                    .setLabel('🔒 ปิดตั๋วแชท (Close Ticket)')
                    .setStyle(ButtonStyle.Danger);

                const welcomeRow = new ActionRowBuilder().addComponents(btnClose);

                await ticketChannel.send({ content: `${user} ยินดีต้อนรับครับ`, embeds: [welcomeEmbed], components: [welcomeRow] });

                await interaction.editReply({ content: `✅ สร้างช่องตั๋วของคุณสำเร็จแล้วครับ: ${ticketChannel}` });

            } catch (error) {
                console.error("เกิดข้อผิดพลาดในการสร้างห้องตั๋ว:", error);
                await interaction.editReply({ content: "❌ ไม่สามารถสร้างห้องตั๋วได้สำเร็จ โปรดตรวจสอบว่าบอทตั๋วได้รับสิทธิ์ในการจัดการช่องแชท (Manage Channels) แล้วนะครับ" });
            }
        }

        // 3. ระบบยืนยันการลบตั๋ว (เมื่อแอดมินหรือผู้ใช้กดปุ่ม ปิดตั๋วแชท)
        if (customId === 'ticket_close_confirm') {
            await interaction.deferReply();

            await interaction.editReply({ content: "⚠️ **ระบบกำลังดำเนินการลบและปิดตั๋วแชทนี้ถาวรในอีก 5 วินาทีครับ...**" });

            // หน่วงเวลาลบแชนเนล 5 วินาทีเพื่อความปลอดภัย
            setTimeout(async () => {
                try {
                    await interaction.channel.delete();
                } catch (error) {
                    console.error("ไม่สามารถลบแชนเนลตั๋วได้:", error);
                }
            }, 5000);
        }
    }
});

// 🔔 สั่งให้ไฟล์ระบบบอทยืนยันตัวตนตัวที่สองทำงานควบคู่กันไป
require('./verify-bot.js');

// สั่งเข้าสู่ระบบบอทตั๋วตัวแรก
client.login(TOKEN);