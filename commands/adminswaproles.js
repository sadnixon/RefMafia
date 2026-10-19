'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { standardEmbed } = require('../message-helpers');

const data = new SlashCommandBuilder()
  .setName('adminswaproles')
  .setDescription('Swap the roles of two players')
  .addUserOption((option) =>
    option
      .setName('user1')
      .setDescription('The first user to swap roles')
      .setRequired(true),
  )
  .addUserOption((option) =>
    option
      .setName('user2')
      .setDescription('The second user to swap roles')
      .setRequired(true),
  );

async function execute(interaction, user) {
  await interaction.deferReply({ ephemeral: true });
  // Only authorized users can authorize other users
  if (!user.isAuthorized) {
    return interaction.editReply({
      content: 'ADMIN ONLY COMMAND',
      ephemeral: true,
    });
  }

  const gameOngoing = await gameInfo.get('inPlay');
  const currentPlayers = await gameInfo.get('players');
  const targetUser1 = interaction.options.getUser('user1').id;
  const targetUser2 = interaction.options.getUser('user2').id;

  if (
    !gameOngoing ||
    !currentPlayers.includes(targetUser1) ||
    !currentPlayers.includes(targetUser2)
  ) {
    await interaction.editReply({
      content: `What if YOU tried to swap someone's roles but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  const gameState = await gameInfo.get('gameState');
  const rolePool = await gameInfo.get('rolePool');
  const gameChannels = await gameInfo.get('game_channels');
  const spiesChannel = await interaction.guild.channels.fetch(
    gameChannels['spies'].channelId,
  );
  const playerChannels = await gameInfo.get('player_channels');
  const player1Index = gameState.players.map((e) => e.id).indexOf(targetUser1);
  const player2Index = gameState.players.map((e) => e.id).indexOf(targetUser2);

  const player1role = gameState.players[player1Index].role;
  const player2role = gameState.players[player2Index].role;

  gameState.players[player1Index].role = player2role;
  gameState.players[player1Index].team = rolePool[player2role].team;
  gameState.players[player1Index].pm = rolePool[player2role].pm;

  gameState.players[player2Index].role = player1role;
  gameState.players[player2Index].team = rolePool[player1role].team;
  gameState.players[player2Index].pm = rolePool[player1role].pm;

  for (const i of [player1Index, player2Index]) {
    let playerChannel;
    try {
      playerChannel = await interaction.guild.channels.fetch(
        playerChannels[gameState.players[i].id].channelId,
      );
    } catch (error) {
      console.error('Failed to get all channels:', error);
      process.exitCode = 1;
      return interaction.channel.send(
        `Game cannot start, the required game channel from <${gameState.players[i].id}> is missing!`,
      );
    }
    await playerChannel.send(
      `**<@${gameState.players[i].id}>, you are ${gameState.players[i].role}!**\n${rolePool[gameState.players[i].role].team === 'Avalon' ? '🟩' : '🟥'} ${rolePool[gameState.players[i].role].pm} ${rolePool[gameState.players[i].role].team === 'Avalon' ? '🟩' : '🟥'}\n\nUse /ack to acknowledge that you have viewed your role and gain access to the public chats.`,
    );

    const knownSpies = gameState.players.filter(
      (e, i) =>
        rolePool[e.role].team === 'Secret Hitler' &&
        rolePool[e.role].nonpack === false,
    );

    if (knownSpies.includes(gameState.players[i].id)) {
      if (
        !_.range(0, 13)
          .map((e) => `${e * 100}`)
          .includes(gameState.players[i].id)
      ) {
        console.log(gameState.players[i].id);
        const member = await interaction.guild.members
          .fetch(gameState.players[i].id)
          .catch(() => null);
        console.log(gameState.players[i].id, member ? 'found' : 'NOT IN GUILD');
        await spiesChannel.permissionOverwrites.edit(gameState.players[i].id, {
          [PermissionFlagsBits.ViewChannel]: true,
          [PermissionFlagsBits.SendMessages]: true,
          [PermissionFlagsBits.ReadMessageHistory]: true,
        });
      }

      await playerChannel.send(
        standardEmbed(
          'The Secret Hitlers stand assembled:',
          `${knownSpies.map((e) => `<@${e}>`).join(', ')}`,
          'Secret Hitler',
        ),
      );
    }
  }

  await gameInfo.set('gameState', gameState);

  await interaction.editReply({
    content: `<@${targetUser1}> has swapped roles with <@${targetUser2}>.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
