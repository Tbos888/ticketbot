require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Events,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    PermissionsBitField,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ==========================================
// ⚙️ MONOCHROME CONFIGURATION (ดำ-ขาว-เทา)
// ==========================================
const CONFIG = {
    THEME: {
        DARK_BG: '#0a0a0a',     // สีดำมืดระดับลึก (Matte Black)
        CHARCOAL: '#1a1a1a',    // สีเทาเข้มเนื้อคอนกรีต (Neutral Dark)
        SILVER: '#8a8a8a',      // สีเทาสว่าง (Muted Silver)
        WHITE: '#ffffff'        // สีขาวสว่างประกาย
    },
    ROLES: {
        STAFF: 'YOUR_STAFF_ROLE_ID' // <--- ใส่ ID ของยศทีมงาน
    },
    CHANNELS: {
        MARKET_PUBLIC: 'YOUR_MARKET_PUBLIC_ID', // <--- ใส่ ID ห้องตลาดสาธารณะ
        MARKET_REVIEW: 'YOUR_MARKET_REVIEW_ID', // <--- ใส่ ID ห้องสตาฟคัดกรองสินค้า
        TICKET_LOGS: 'YOUR_TICKET_LOGS_ID'     // <--- ใส่ ID ห้องเก็บประวัติการเปิด-ปิดตั๋ว
    }
};

// ตรวจสอบความถูกต้องของ Snowflake ID
const isValidSnowflake = (id) => /^\d{17,19}$/.test(id);

client.once(Events.ClientReady, () => {
    console.log(`\n==============================================\n[🚀 SYSTEM ACTIVE] Logged in as: ${client.user.tag}\n==============================================`);
});

// ==========================================
// 🛠️ UTILITY FUNCTIONS (ฟังก์ชันช่วยทำงาน)
// ==========================================

// ระบบช่วยเรนเดอร์ไฟล์บันทึกประวัติห้องแชท (Transcript Engine)
async function generateTranscript(channel) {
    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        let transcript = `# TRANSCRIPT LOG FOR CHANNEL: ${channel.name}\n`;
        transcript += `Exported on: ${new Date().toUTCString()}\n`;
        transcript += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        const sorted = Array.from(messages.values()).reverse();
        for (const msg of sorted) {
            const time = msg.createdAt.toISOString().replace('T', ' ').substring(0, 19);
            transcript += `[${time}] ${msg.author.tag} (${msg.author.id}):\n`;
            if (msg.content) transcript += `> ${msg.content}\n`;
            if (msg.attachments.size > 0) {
                transcript += `> [ไฟล์แนบ: ${msg.attachments.map(a => a.url).join(', ')}]\n`;
            }
            transcript += `\n`;
        }
        return Buffer.from(transcript, 'utf-8');
    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาดในการสร้าง Transcript:', err);
        return null;
    }
}

// ==========================================
// 🔀 INTERACTION ROUTER ENGINE (ระบบจัดเส้นทาง)
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // --- 1. จัดการคำสั่งแบบสแลช (Slash Commands Router) ---
        if (interaction.isChatInputCommand()) {
            
            // คำสั่ง /sell
            if (interaction.commandName === 'sell') {
                const game = interaction.options.getString('game');
                const price = interaction.options.getString('price');
                const detail = interaction.options.getString('detail');
                const image = interaction.options.getAttachment('image');

                const embed = new EmbedBuilder()
                    .setColor(CONFIG.THEME.CHARCOAL)
                    .setAuthor({ name: 'FLEXDAS MARKETPLACE • PENDING APPROVAL', iconURL: client.user.displayAvatarURL() })
                    .setTitle(`🔥 เสนอขายไอดีเกม: ${game.toUpperCase()}`)
                    .setDescription(`
> **รอยืนยันความสมบูรณ์ของบัญชีจากทีมงานแอดมิน**
> **ผู้ลงประกาศขาย:** ${interaction.user} (\`${interaction.user.id}\`)
━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
                    .addFields(
                        { name: '🎮 เกม / แพลตฟอร์ม', value: `\`\`\`yaml\n${game}\n\`\`\``, inline: true },
                        { name: '💰 ราคาขายสุทธิ', value: `\`\`\`yaml\n${price} บาท\n\`\`\``, inline: true },
                        { name: '📋 ข้อมูลสินค้าและเงื่อนไข', value: `>>> ${detail}` }
                    )
                    .setFooter({ text: 'ระบบตรวจสอบความปลอดภัย • FlexDas' })
                    .setTimestamp();

                if (image) embed.setImage(image.url);

                const reviewChannel = interaction.guild.channels.cache.get(CONFIG.CHANNELS.MARKET_REVIEW);
                if (reviewChannel && isValidSnowflake(CONFIG.CHANNELS.MARKET_REVIEW)) {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`market:approve:${interaction.user.id}:${game.replace(/\s+/g, '_')}`)
                                .setLabel('✅ อนุมัติลงประกาศ')
                                .setStyle(ButtonStyle.Secondary), // คุมโทนเทา
                            new ButtonBuilder()
                                .setCustomId(`market:reject_trigger:${interaction.user.id}`)
                                .setLabel('❌ ปฏิเสธ')
                                .setStyle(ButtonStyle.Danger) // แดงเตือนภัย
                        );

                    await reviewChannel.send({
                        content: `📢 คำเสนอขายใหม่จากคุณ ${interaction.user} โปรดพิจารณาความปลอดภัยก่อนเปิดการขายต่อสาธารณะ`,
                        embeds: [embed],
                        components: [row]
                    });

                    await interaction.reply({
                        content: '✅ **ส่งคำขอข้อมูลไอดีเกมไปยังห้องสตาฟคัดกรองแล้ว** ระบบจะแจ้งผลกลับหาคุณเมื่อแอดมินตรวจสอบเสร็จสิ้นครับ',
                        ephemeral: true
                    });
                } else {
                    // Fallback Direct Mode
                    const fallbackRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setLabel('👤 โปรไฟล์ผู้ลงขาย').setStyle(ButtonStyle.Link).setURL(`https://discord.com/users/${interaction.user.id}`)
                    );
                    await interaction.reply({
                        content: '⚠️ *แอปพลิเคชันกำลังรันในโหมดสำรอง (Direct Mode) เนื่องจากไม่ได้ระบุคลังสตาฟในระบบ*',
                        embeds: [embed],
                        components: [fallbackRow]
                    });
                }
                return;
            }

            // คำสั่ง /panel
            if (interaction.commandName === 'panel') {
                const embed = new EmbedBuilder()
                    .setColor(CONFIG.THEME.DARK_BG)
                    .setAuthor({ name: 'FLEXDAS INTERACTIVE PANEL', iconURL: client.user.displayAvatarURL() })
                    .setTitle('🖤 Welcome to FlexDas Terminal')
                    .setDescription(`
ยินดีต้อนรับเข้าสู่แผงควบคุมหลักบริการของ **FlexDas**
โปรดทำรายการผ่านแบบฟอร์มปุ่มกดด้านล่างนี้ได้ทันทีครับ

**⚙️ แผนกบริการหลัก**
> 🛒 **สั่งทำบริการและจัดซื้อไอดี (Buy Service)**
> แฟ้มสั่งทำเว็บไซต์ ระบบฐานข้อมูล และเลือกซื้อไอดีเกมต่าง ๆ
> 
> 💰 **เสนอขายสินค้ากับแบรนด์ (Sell to Us)**
> ส่งข้อมูลประวัติและเงื่อนไขไอดีเกมที่ต้องการขายให้กับทางเรา
> 
> 🛠️ **แจ้งปัญหา / คำขอพิเศษ (Help Center)**
> แผนกรับเรื่องบั๊ก เคลมประกัน หรือพูดคุยโดยตรงกับฝ่ายเทคนิค
━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
                    .setFooter({ text: 'Monochrome Interactive System • FlexDas' })
                    .setTimestamp();

                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('ticket:init:buy').setLabel('🛒 สั่งบริการ/ซื้อ ID').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ticket:init:sell').setLabel('💰 เสนอขายไอดี').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ticket:init:support').setLabel('🛠️ แจ้งเรื่องช่วยเหลือ').setStyle(ButtonStyle.Secondary)
                    );

                await interaction.reply({ embeds: [embed], components: [row] });
                return;
            }
        }

        // --- 2. จัดการข้อมูลกดปุ่ม (Buttons Router) ---
        if (interaction.isButton()) {
            const [namespace, action, arg1, arg2] = interaction.customId.split(':');

            // จัดการ Namespace เกี่ยวกับตั๋ว [ticket]
            if (namespace === 'ticket') {
                
                // เริ่มต้นสร้างตั๋ว (แสดงป๊อปอัปกรอกฟอร์ม)
                if (action === 'init') {
                    const type = arg1; // buy, sell, support
                    const modal = new ModalBuilder().setCustomId(`modal:ticket:${type}`);

                    if (type === 'buy') {
                        modal.setTitle('🛒 สั่งซื้อสินค้า & ตกลงบริการ')
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('buy_type').setLabel('📌 ประเภทบริการที่สนใจ').setPlaceholder('เช่น จ้างเขียนเว็บ / ซื้อไอดี Valorant').setStyle(TextInputStyle.Short).setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('buy_detail').setLabel('📝 สเปกความต้องการอย่างละเอียด').setPlaceholder('ระบุข้อกำหนดฟังก์ชันที่ต้องการให้ครบถ้วน').setStyle(TextInputStyle.Paragraph).setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('buy_budget').setLabel('💰 งบประมาณที่เตรียมไว้ (บาท)').setPlaceholder('ป้อนจำนวนงบ หรือกรอกว่า "ตามความเหมาะสม"').setStyle(TextInputStyle.Short).setRequired(false))
                            );
                    } else if (type === 'sell') {
                        modal.setTitle('💰 เสนอขายสินค้า / ฝากไอดีขาย')
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sell_game').setLabel('🎮 ชื่อเกมและข้อมูลไอดี').setPlaceholder('ระบุชื่อเกม เช่น Valorant, Roblox, Steam').setStyle(TextInputStyle.Short).setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sell_price').setLabel('💵 ราคาที่ต้องการส่งดีล (บาท)').setPlaceholder('ระบุเป้าหมายราคาสุทธิของคุณ').setStyle(TextInputStyle.Short).setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('sell_desc').setLabel('📋 ข้อมูลประกันและประวัติความปลอดภัย').setPlaceholder('อธิบายความปลอดภัย แหล่งที่มาของไอดีเพื่อความน่าเชื่อถือ').setStyle(TextInputStyle.Paragraph).setRequired(true))
                            );
                    } else if (type === 'support') {
                        modal.setTitle('🛠️ แผนกแจ้งเรื่อง / ส่งรายงานช่วยเหลือ')
                            .addComponents(
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('support_title').setLabel('❓ หัวข้อปัญหาหลักที่พบ').setPlaceholder('เช่น ระบบหลังบ้านเข้าไม่ได้ / ติดต่อสตาฟเร่งด่วน').setStyle(TextInputStyle.Short).setRequired(true)),
                                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('support_desc').setLabel('📝 บรรยายเหตุการณ์และข้อมูลเพิ่มเติม').setPlaceholder('อธิบายขั้นตอนที่เกิดปัญหาให้เข้าใจง่ายที่สุด').setStyle(TextInputStyle.Paragraph).setRequired(true))
                            );
                    }

                    await interaction.showModal(modal);
                    return;
                }

                // รับเคส (Claim) โดยแอดมิน
                if (action === 'claim') {
                    const isStaff = interaction.member.roles.cache.has(CONFIG.ROLES.STAFF) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
                    if (!isStaff) return interaction.reply({ content: '❌ เฉพาะแอดมินหรือทีมงานตรวจสอบเท่านั้นที่สามารถกดรับเคสนี้ได้!', ephemeral: true });

                    const embed = EmbedBuilder.from(interaction.message.embeds[0])
                        .addFields({ name: '🙋 เจ้าหน้าที่รับช่วงดูแล', value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true });

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket:claimed_disabled').setLabel('🙋 รับดูแลเรียบร้อยแล้ว').setStyle(ButtonStyle.Secondary).setDisabled(true),
                        new ButtonBuilder().setCustomId('ticket:close').setLabel('🔒 ปิดห้องตั๋ว (Close)').setStyle(ButtonStyle.Danger)
                    );

                    await interaction.update({ embeds: [embed], components: [row] });
                    await interaction.channel.send({ content: `📢 **ระบบอัปเดต: เจ้าหน้าที่ ${interaction.user} ได้เข้ามาดูแลตั๋วนี้อย่างเป็นทางการแล้วครับ**` });
                    return;
                }

                // ปิดตั๋วและพิมพ์ Transcript
                if (action === 'close') {
                    const closingEmbed = new EmbedBuilder()
                        .setColor(CONFIG.THEME.DARK_BG)
                        .setTitle('🔒 ดำเนินการเก็บบันทึกประวัติและเตรียมลบตั๋ว')
                        .setDescription(`
> **ระบบกำลังจัดทำและประมวลผลประวัติบทสนทนา (Transcript Archive)**
> ⏳ ห้องสนทนานี้จะทำลายตัวเองถาวรภายใน **5 วินาที**...
━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [closingEmbed] });

                    // สร้าง Transcript
                    const transcriptBuffer = await generateTranscript(interaction.channel);
                    const logChannel = interaction.guild.channels.cache.get(CONFIG.CHANNELS.TICKET_LOGS);

                    if (logChannel && isValidSnowflake(CONFIG.CHANNELS.TICKET_LOGS) && transcriptBuffer) {
                        const logEmbed = new EmbedBuilder()
                            .setColor(CONFIG.THEME.CHARCOAL)
                            .setTitle('🗑️ TICKET TRANSACTION EXPORTED')
                            .setDescription(`
• **ชื่อห้องตั๋วที่ถูกเคลียร์:** \`${interaction.channel.name}\`
• **ผู้รับเรื่องปิดงาน:** ${interaction.user} (\`${interaction.user.id}\`)
• **เวลาสิ้นสุดคำขอ:** <t:${Math.floor(Date.now() / 1000)}:F>
━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
                            .setTimestamp();

                        const file = new AttachmentBuilder(transcriptBuffer, { name: `transcript-${interaction.channel.name}.md` });
                        await logChannel.send({ embeds: [logEmbed], files: [file] });
                    }

                    setTimeout(async () => {
                        try { await interaction.channel.delete(); } catch (err) { console.error(err); }
                    }, 5000);
                    return;
                }
            }

            // จัดการ Namespace เกี่ยวกับตลาดซื้อขายกลาง [market]
            if (namespace === 'market') {
                const isStaff = interaction.member.roles.cache.has(CONFIG.ROLES.STAFF) || interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

                // สตาฟอนุมัติ
                if (action === 'approve') {
                    if (!isStaff) return interaction.reply({ content: '❌ เฉพาะยศสตาฟที่มีหน้าที่ดูแลความปลอดภัยเท่านั้นที่อนุมัติได้!', ephemeral: true });

                    const sellerId = arg1;
                    const publicChannel = interaction.guild.channels.cache.get(CONFIG.CHANNELS.MARKET_PUBLIC);
                    const originalEmbed = interaction.message.embeds[0];

                    if (!originalEmbed || !publicChannel) return interaction.reply({ content: '❌ ระบบขัดข้อง ไม่พบห้องปลายทางหรือโพสต์หลัก', ephemeral: true });

                    const approvedEmbed = EmbedBuilder.from(originalEmbed)
                        .setColor(CONFIG.THEME.WHITE)
                        .setAuthor({ name: 'FLEXDAS MARKETPLACE • APPROVED DEAL', iconURL: client.user.displayAvatarURL() })
                        .setDescription(`
# 🎮 [ยืนยันแล้ว] เปิดดีลไอดีเกมสาธารณะ!

> 💎 **สถานะความปลอดภัย: ตรวจสอบประวัติผ่านเกณฑ์**
> 🛒 **หากคุณสนใจซื้อขายไอดีนี้ โปรดคลิกที่ปุ่มด้านล่างเพื่อดำเนินขั้นตอนติดต่อผู้ซื้อและผู้ขายอัตโนมัติทันที**
━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

                    const buyRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`market:buy:${sellerId}:${arg2}`)
                            .setLabel('🛒 ติดต่อขอซื้อไอดีนี้ทันที')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await publicChannel.send({ embeds: [approvedEmbed], components: [buyRow] });

                    // อัปเดตห้องคิวตรวจสอบ
                    const updateEmbed = EmbedBuilder.from(originalEmbed)
                        .setColor(CONFIG.THEME.WHITE)
                        .setTitle('✅ อนุมัติการประกาศขายเรียบร้อยแล้ว')
                        .setDescription(`ตรวจสอบและคัดกรองโดย: ${interaction.user}`);

                    await interaction.update({ embeds: [updateEmbed], components: [] });
                    return;
                }

                // สตาฟปฏิเสธ (เรียกหน้าต่างป๊อปอัปให้เขียนเหตุผล)
                if (action === 'reject_trigger') {
                    if (!isStaff) return interaction.reply({ content: '❌ เฉพาะยศสตาฟที่มีหน้าที่ดูแลความปลอดภัยเท่านั้นที่ปฏิเสธได้!', ephemeral: true });

                    const sellerId = arg1;
                    const modal = new ModalBuilder()
                        .setCustomId(`modal:reject:${sellerId}:${interaction.message.id}`)
                        .setTitle('❌ เหตุผลที่ปฏิเสธคำขอลงขาย');

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('reject_reason')
                        .setLabel('📝 กรุณาระบุสาเหตุที่ปฏิเสธโพสต์นี้')
                        .setPlaceholder('เช่น รายละเอียดประวัติไม่ชัดเจน / บัญชีไม่มีความปลอดภัยพอ')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);

                    modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
                    await interaction.showModal(modal);
                    return;
                }

                // ลูกค้ากดเชื่อมดีลซื้อขายอัตโนมัติ (Automated Buyer-Seller Connection Pipeline)
                if (action === 'buy') {
                    const sellerId = arg1;
                    const game = arg2 ? arg2.replace(/_/g, ' ') : 'ไม่ระบุเกม';

                    if (interaction.user.id === sellerId) {
                        return interaction.reply({ content: '❌ คุณไม่สามารถติดต่อซื้อไอดีเกมที่ตัวคุณเองเป็นคนเสนอลงประกาศได้!', ephemeral: true });
                    }

                    const sellerUser = await client.users.fetch(sellerId).catch(() => null);
                    if (!sellerUser) return interaction.reply({ content: '❌ ระบบไม่สามารถดึงข้อมูลผู้ขายได้ในขณะนี้', ephemeral: true });

                    // สร้างห้องเชื่อมต่อคู่ดีล
                    const dealChannel = await interaction.guild.channels.create({
                        name: `deal-${game.toLowerCase().replace(/\s+/g, '-')}-${interaction.user.username.toLowerCase()}`,
                        type: ChannelType.GuildText,
                        permissionOverwrites: [
                            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                            {
                                id: interaction.user.id, // ผู้ซื้อ
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks]
                            },
                            {
                                id: sellerId, // ผู้ขาย
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks]
                            },
                            {
                                id: client.user.id, // บอท
                                allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.EmbedLinks]
                            }
                        ]
                    });

                    const dealEmbed = new EmbedBuilder()
                        .setColor(CONFIG.THEME.DARK_BG)
                        .setAuthor({ name: 'FLEXDAS MARKETPLACE • DEAL ESTABLISHED', iconURL: client.user.displayAvatarURL() })
                        .setTitle(`💼 เชื่อมต่อคู่ซื้อขายดีล: ${game.toUpperCase()}`)
                        .setDescription(`
ระบบอัจฉริยะได้เชื่อมต่อคู่ทำธุรกรรมในห้องลับเฉพาะตัวเรียบร้อยแล้วครับ

**👥 ข้อมูลคู่ดีลสั่งซื้อ**
> 🛒 **ผู้ซื้อสินค้า:** ${interaction.user} (\`${interaction.user.id}\`)
> 💰 **ผู้ลงขายไอดี:** ${sellerUser} (\`${sellerUser.id}\`)
━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
                        .addFields(
                            { name: '📋 คำเตือนความปลอดภัยระหว่างทำรายการ', value: ">>> • โปรดโอนย้ายความปลอดภัยบัญชีเกมให้ครบถ้วนในห้องดีลแชทนี้เท่านั้น\n• กรุณารอทีมงานกลางเข้ามาร่วมทำการสุ่มตรวจและดูแลการโอน เพื่อความโปร่งใส ปราศจากการฉ้อโกง" }
                        )
                        .setFooter({ text: 'FlexDas Security Pipeline' })
                        .setTimestamp();

                    const controlRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('ticket:claim').setLabel('🙋 รับคนกลางดูแลดีล (Claim)').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('ticket:close').setLabel('🔒 ปิดห้องดีล (Close)').setStyle(ButtonStyle.Danger)
                    );

                    const staffMention = isValidSnowflake(CONFIG.ROLES.STAFF) ? `<@&${CONFIG.ROLES.STAFF}>` : 'ทีมงานแอดมิน';

                    await dealChannel.send({
                        content: `🔔 ยินดีต้อนรับคู่ค้า ${interaction.user} และ ${sellerUser} | ดึงแอดมินคนกลางร่วมดีล: ${staffMention}`,
                        embeds: [dealEmbed],
                        components: [controlRow]
                    });

                    await interaction.reply({ content: `✅ **ทำการสร้างห้องติดต่อดีลส่วนตัวเรียบร้อยแล้ว!** กรุณาเข้าตรวจสอบได้ที่ห้องนี้ครับ: ${dealChannel}`, ephemeral: true });
                    return;
                }
            }
        }

        // --- 3. จัดการการกรอกข้อมูลในหน้าต่างป๊อปอัป (Modal Submissions Router) ---
        if (interaction.isModalSubmit()) {
            const [namespace, action, arg1, arg2] = interaction.customId.split(':');

            // ประมวลผล Modal ตั๋วสั่งทำบริการและแจ้งปัญหาต่างๆ
            if (namespace === 'modal' && action === 'ticket') {
                const type = arg1; // buy, sell, support
                const existing = interaction.guild.channels.cache.find(c => c.name === `${type}-${interaction.user.username.toLowerCase()}`);

                if (existing) return interaction.reply({ content: `❌ คุณมีห้องบริการตั๋วแนวนี้ค้างคาไว้อยู่แล้วในระบบ! ${existing}`, ephemeral: true });

                const channel = await interaction.guild.channels.create({
                    name: `${type}-${interaction.user.username.toLowerCase()}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                        {
                            id: interaction.user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles, PermissionsBitField.Flags.EmbedLinks]
                        },
                        {
                            id: client.user.id,
                            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.EmbedLinks]
                        }
                    ]
                });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket:claim').setLabel('🙋 รับดูแลเคส (Claim)').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('ticket:close').setLabel('🔒 ปิดตั๋วบริการ (Close)').setStyle(ButtonStyle.Danger)
                );

                const embed = new EmbedBuilder()
                    .setAuthor({ name: 'FLEXDAS TICKET INTERACTION', iconURL: client.user.displayAvatarURL() })
                    .setTimestamp();

                if (type === 'buy') {
                    const buyType = interaction.fields.getTextInputValue('buy_type');
                    const buyDetail = interaction.fields.getTextInputValue('buy_detail');
                    const buyBudget = interaction.fields.getTextInputValue('buy_budget') || 'ไม่ได้ระบุ';

                    embed.setColor(CONFIG.THEME.WHITE) // คุมโทนสีขาวสว่าง
                        .setTitle('🛒 FLEXDAS • ORDER VERIFIED')
                        .setDescription(`สวัสดีครับคุณ ${interaction.user} บอทระบบได้อัปเดตสรุปข้อมูลการสั่งทำบริการของคุณเรียบร้อยแล้ว`)
                        .addFields(
                            { name: '📌 ประเภทสินค้าหรือดีลที่ระบุ', value: `\`\`\`yaml\n${buyType}\n\`\`\`` },
                            { name: '📝 ความต้องการและเป้าหมายสเปกงาน', value: `>>> ${buyDetail}` },
                            { name: '💰 งบประมาณที่คุณประสงค์จ่าย', value: `\`\`\`yaml\n${buyBudget}\n\`\`\``, inline: true }
                        );
                } else if (type === 'sell') {
                    const sellGame = interaction.fields.getTextInputValue('sell_game');
                    const sellPrice = interaction.fields.getTextInputValue('sell_price');
                    const sellDesc = interaction.fields.getTextInputValue('sell_desc');

                    embed.setColor(CONFIG.THEME.CHARCOAL) // คุมโทนสีเทาคอนกรีต
                        .setTitle('💰 FLEXDAS • SELLING CONTRACT')
                        .setDescription(`สวัสดีครับคุณ ${interaction.user} บอทระบบได้ลงทะเบียนข้อตกลงและประวัติไอดีเกมของคุณเรียบร้อยแล้ว`)
                        .addFields(
                            { name: '🎮 ข้อมูลชื่อเกมที่ต้องการปล่อยขาย', value: `\`\`\`yaml\n${sellGame}\n\`\`\`` },
                            { name: '💵 ราคากระซิบดีลขายที่คาดหวัง', value: `\`\`\`yaml\n${sellPrice} บาท\n\`\`\``, inline: true },
                            { name: '📋 ประวัติ ข้อมูล และความปลอดภัยบัญชี', value: `>>> ${sellDesc}` }
                        );
                } else if (type === 'support') {
                    const supportTitle = interaction.fields.getTextInputValue('support_title');
                    const supportDesc = interaction.fields.getTextInputValue('support_desc');

                    embed.setColor(CONFIG.THEME.SILVER) // คุมโทนสีเทาสว่าง
                        .setTitle('🛠️ FLEXDAS • HELP DESK OPENED')
                        .setDescription(`สวัสดีครับคุณ ${interaction.user} แฟ้มระบบรายงานปัญหาของคุณถูกส่งเรื่องเข้าแผนกสตาฟแล้ว`)
                        .addFields(
                            { name: '❓ ปัญหาทางระบบที่พบเจอล่าสุด', value: `\`\`\`yaml\n${supportTitle}\n\`\`\`` },
                            { name: '📝 ข้อมูลสภาวะบั๊กและการทำงานเพิ่มเติม', value: `>>> ${supportDesc}` }
                        );
                }

                const staffMention = isValidSnowflake(CONFIG.ROLES.STAFF) ? `<@&${CONFIG.ROLES.STAFF}>` : 'ทีมงานแอดมิน';
                await channel.send({ content: `${interaction.user} | 🔔 เจ้าหน้าที่ร่วมตรวจสอบ: ${staffMention}`, embeds: [embed], components: [row] });

                await interaction.reply({ content: `✅ **ระบบเปิดห้องดูแลตั๋วช่วยเหลือเรียบร้อยแล้วที่นี่:** ${channel}`, ephemeral: true });
                return;
            }

            // ประมวลผล Modal เหตุผลการปฏิเสธคำขอลงขายของสตาฟ
            if (namespace === 'modal' && action === 'reject') {
                const sellerId = arg1;
                const messageId = arg2;
                const reason = interaction.fields.getTextInputValue('reject_reason');

                const sellerUser = await client.users.fetch(sellerId).catch(() => null);
                if (sellerUser) {
                    const dmEmbed = new EmbedBuilder()
                        .setColor(CONFIG.THEME.SILVER)
                        .setAuthor({ name: 'FLEXDAS MARKETPLACE • SYSTEM NOTIFICATION' })
                        .setTitle('❌ ดีลประกาศขายของคุณไม่ผ่านการอนุมัติ')
                        .setDescription(`
สวัสดีครับคุณ **${sellerUser.username}** 
แอดมินได้ทำการตรวจสอบการยื่นเสนอเรื่องประกาศขายไอดีเกมของคุณแล้วพบว่าข้อมูลยังไม่ผ่านเกณฑ์มาตรฐาน

**📋 รายละเอียดเหตุผลจากทีมงานแอดมิน:**
> \`\`\`\n${reason}\n\`\`\`
━━━━━━━━━━━━━━━━━━━━━━━━━━
`)
                        .setFooter({ text: 'โปรดแก้ไขรายละเอียดให้ครบถ้วนเพื่อทำการยื่นเรื่องใหม่อีกครั้ง' })
                        .setTimestamp();

                    await sellerUser.send({ embeds: [dmEmbed] }).catch(() => console.log('❌ ไม่สามารถส่ง DM ถึงผู้ใช้งานนี้ได้'));
                }

                // ลบโพสต์ออกจากคิวในห้องตรวจสอบของแอดมิน
                const reviewChannel = interaction.guild.channels.cache.get(CONFIG.CHANNELS.MARKET_REVIEW);
                if (reviewChannel) {
                    const targetMessage = await reviewChannel.messages.fetch(messageId).catch(() => null);
                    if (targetMessage) await targetMessage.delete().catch(() => null);
                }

                await interaction.reply({ content: `✅ **ทำการปฏิเสธโพสต์ขายเรียบร้อย** บอทส่งข้อความแจ้งเตือนสาเหตุให้ผู้ใช้งานทาง DM อัตโนมัติแล้วครับ`, ephemeral: true });
                return;
            }
        }

    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาดรุนแรงระดับ Interaction:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ ตัวแอปพลิเคชันหลักขัดข้องภายนอกชั่วคราว กรุณาลองทดสอบใหม่อีกครั้งในภายหลังครับ', ephemeral: true }).catch(() => null);
        }
    }
});

client.login(process.env.TOKEN);