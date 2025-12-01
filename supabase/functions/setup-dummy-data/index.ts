import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    console.log('Setting up dummy data for user:', user.id);

    // Create a current season
    const { data: season, error: seasonError } = await supabaseClient
      .from('seasons')
      .insert({
        season_number: 1,
        sport: 'football',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
        status: 'active',
      })
      .select()
      .single();

    if (seasonError) {
      console.error('Season creation error:', seasonError);
      throw seasonError;
    }

    console.log('Created season:', season.id);

    // Create competitions for different sports and divisions
    const competitions = [
      {
        name: 'Premier League - Division 1',
        sport: 'football',
        division: 1,
        entry_fee: 100,
        prize_coins: 500,
        max_participants: 8,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        season_id: season.id,
        status: 'active',
      },
      {
        name: 'Championship - Division 2',
        sport: 'football',
        division: 2,
        entry_fee: 75,
        prize_coins: 350,
        max_participants: 8,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        season_id: season.id,
        status: 'active',
      },
      {
        name: 'NBA Finals - Division 1',
        sport: 'basketball',
        division: 1,
        entry_fee: 150,
        prize_coins: 600,
        max_participants: 6,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        season_id: season.id,
        status: 'active',
      },
      {
        name: 'Grand Slam Tournament',
        sport: 'tennis',
        division: 1,
        entry_fee: 200,
        prize_coins: 800,
        max_participants: 8,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        season_id: season.id,
        status: 'upcoming',
      },
    ];

    const { data: createdComps, error: compError } = await supabaseClient
      .from('competitions')
      .insert(competitions)
      .select();

    if (compError) {
      console.error('Competition creation error:', compError);
      throw compError;
    }

    console.log('Created competitions:', createdComps.length);

    // Create dummy teams for the user
    const userTeams = [
      { team_name: 'Manchester Red Devils', sport: 'football', division: 1 },
      { team_name: 'London Blues', sport: 'football', division: 2 },
      { team_name: 'LA Champions', sport: 'basketball', division: 1 },
      { team_name: 'Wimbledon Stars', sport: 'tennis', division: 1 },
    ];

    const { data: createdTeams, error: teamsError } = await supabaseClient
      .from('user_teams')
      .insert(
        userTeams.map((team) => ({
          ...team,
          user_id: user.id,
        }))
      )
      .select();

    if (teamsError) {
      console.error('Teams creation error:', teamsError);
      throw teamsError;
    }

    console.log('Created teams:', createdTeams.length);

    // Create dummy opponent teams (AI teams)
    const dummyUserId = '00000000-0000-0000-0000-000000000000'; // Placeholder for AI teams
    const opponentTeams = [
      { team_name: 'Arsenal Warriors', sport: 'football', division: 1, user_id: dummyUserId },
      { team_name: 'Chelsea Giants', sport: 'football', division: 1, user_id: dummyUserId },
      { team_name: 'Liverpool Legends', sport: 'football', division: 1, user_id: dummyUserId },
      { team_name: 'Tottenham Tigers', sport: 'football', division: 2, user_id: dummyUserId },
      { team_name: 'West Ham Heroes', sport: 'football', division: 2, user_id: dummyUserId },
      { team_name: 'Boston Celtics', sport: 'basketball', division: 1, user_id: dummyUserId },
      { team_name: 'Golden State Warriors', sport: 'basketball', division: 1, user_id: dummyUserId },
      { team_name: 'Miami Heat', sport: 'basketball', division: 1, user_id: dummyUserId },
      { team_name: 'Rafael Stars', sport: 'tennis', division: 1, user_id: dummyUserId },
      { team_name: 'Novak Champions', sport: 'tennis', division: 1, user_id: dummyUserId },
    ];

    // Insert opponent teams directly using service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: opponentTeamsData, error: opponentError } = await supabaseAdmin
      .from('user_teams')
      .insert(opponentTeams)
      .select();

    if (opponentError) {
      console.error('Opponent teams creation error:', opponentError);
      throw opponentError;
    }

    console.log('Created opponent teams:', opponentTeamsData.length);

    // Enroll teams in competitions
    const footballComp1 = createdComps.find((c) => c.name === 'Premier League - Division 1');
    const footballComp2 = createdComps.find((c) => c.name === 'Championship - Division 2');
    const basketballComp = createdComps.find((c) => c.name === 'NBA Finals - Division 1');
    const tennisComp = createdComps.find((c) => c.name === 'Grand Slam Tournament');

    const participants = [];

    // Football Division 1 participants
    if (footballComp1) {
      const footballTeam1 = createdTeams.find((t) => t.team_name === 'Manchester Red Devils');
      const footballOpponents1 = opponentTeamsData.filter(
        (t) => t.sport === 'football' && t.division === 1
      );
      if (footballTeam1) {
        participants.push({ competition_id: footballComp1.id, team_id: footballTeam1.id });
      }
      footballOpponents1.forEach((t) => {
        participants.push({ competition_id: footballComp1.id, team_id: t.id });
      });
    }

    // Football Division 2 participants
    if (footballComp2) {
      const footballTeam2 = createdTeams.find((t) => t.team_name === 'London Blues');
      const footballOpponents2 = opponentTeamsData.filter(
        (t) => t.sport === 'football' && t.division === 2
      );
      if (footballTeam2) {
        participants.push({ competition_id: footballComp2.id, team_id: footballTeam2.id });
      }
      footballOpponents2.forEach((t) => {
        participants.push({ competition_id: footballComp2.id, team_id: t.id });
      });
    }

    // Basketball participants
    if (basketballComp) {
      const basketballTeam = createdTeams.find((t) => t.team_name === 'LA Champions');
      const basketballOpponents = opponentTeamsData.filter((t) => t.sport === 'basketball');
      if (basketballTeam) {
        participants.push({ competition_id: basketballComp.id, team_id: basketballTeam.id });
      }
      basketballOpponents.forEach((t) => {
        participants.push({ competition_id: basketballComp.id, team_id: t.id });
      });
    }

    // Tennis participants
    if (tennisComp) {
      const tennisTeam = createdTeams.find((t) => t.team_name === 'Wimbledon Stars');
      const tennisOpponents = opponentTeamsData.filter((t) => t.sport === 'tennis');
      if (tennisTeam) {
        participants.push({ competition_id: tennisComp.id, team_id: tennisTeam.id });
      }
      tennisOpponents.forEach((t) => {
        participants.push({ competition_id: tennisComp.id, team_id: t.id });
      });
    }

    const { error: participantsError } = await supabaseAdmin
      .from('competition_participants')
      .insert(participants);

    if (participantsError) {
      console.error('Participants enrollment error:', participantsError);
      throw participantsError;
    }

    console.log('Enrolled participants:', participants.length);

    // Generate fixtures for active competitions
    const activeComps = createdComps.filter((c) => c.status === 'active');

    for (const comp of activeComps) {
      const { data: compParticipants } = await supabaseAdmin
        .from('competition_participants')
        .select('team_id')
        .eq('competition_id', comp.id);

      if (compParticipants && compParticipants.length >= 2) {
        const teamIds = compParticipants.map((p) => p.team_id);
        const matches = [];

        // Generate round-robin fixtures
        for (let i = 0; i < teamIds.length; i++) {
          for (let j = i + 1; j < teamIds.length; j++) {
            const matchDate = new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000);
            matches.push({
              competition_id: comp.id,
              home_team_id: teamIds[i],
              away_team_id: teamIds[j],
              match_date: matchDate.toISOString(),
              status: 'scheduled',
              match_day: Math.floor(matches.length / (teamIds.length / 2)) + 1,
            });
          }
        }

        const { error: matchesError } = await supabaseAdmin.from('matches').insert(matches);

        if (matchesError) {
          console.error('Matches creation error:', matchesError);
          throw matchesError;
        }

        console.log(`Created ${matches.length} matches for competition:`, comp.name);

        // Update competition status
        await supabaseAdmin
          .from('competitions')
          .update({ match_generation_status: 'completed' })
          .eq('id', comp.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dummy data created successfully!',
        data: {
          season: season.id,
          competitions: createdComps.length,
          teams: createdTeams.length,
          participants: participants.length,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in setup-dummy-data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
