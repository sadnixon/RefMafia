'use strict';

const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('adminsetshield')
  .setDescription('Add or remove a shield from a player')
  .addUserOption((option) =>
    option
      .setName('user')
      .setDescription('The user to add or remove a shield on')
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName('direction')
      .setDescription('Whether to add or remove a shield from the player')
      .setRequired(true)
      .addChoices(
        {
          name: 'Add',
          value: 'add',
        },
        {
          name: 'Remove',
          value: 'remove',
        },
      ),
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
  const targetUser = interaction.options.getUser('user').id;

  if (!gameOngoing || !currentPlayers.includes(targetUser)) {
    await interaction.editReply({
      content: `What if YOU tried to set someone's shields but SadNixon said "NO"`,
      ephemeral: true,
    });
    return;
  }

  const direction = interaction.options.getString('direction');
  const gameState = await gameInfo.get('gameState');
  const playerIndex = gameState.players.map((e) => e.id).indexOf(targetUser);

  if (direction === 'add') {
    gameState.players[playerIndex].shields += 1;
  } else {
    gameState.players[playerIndex].shields -= 1;
  }
  await gameInfo.set('gameState', gameState);

  await interaction.editReply({
    content: `<@${targetUser}> now has ${gameState.players[playerIndex].shields} shields.`,
    ephemeral: true,
  });
}

module.exports = {
  data,
  execute,
};
