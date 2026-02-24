import supabase from './supabaseService.js';

export async function sendWateringReminders() {
  try {
    const { data: plants } = await supabase
      .from('user_plants')
      .select('id, user_id, plant_name, care_guide, created_at');

    if (!plants?.length) return;

    const notifications = [];

    for (const plant of plants) {
      if (!plant.care_guide?.reminderSchedule) continue;

      const { wateringDays, fertilizingDays, repottingMonths } = plant.care_guide.reminderSchedule;
      const daysSinceAdded = Math.floor((new Date() - new Date(plant.created_at)) / (1000 * 60 * 60 * 24));

      const { data: lastWater } = await supabase
        .from('notifications')
        .select('created_at')
        .eq('plant_id', plant.id)
        .eq('type', 'watering')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const daysSinceLastWater = lastWater
        ? Math.floor((new Date() - new Date(lastWater.created_at)) / (1000 * 60 * 60 * 24))
        : wateringDays + 1;

      if (daysSinceLastWater >= wateringDays) {
        notifications.push({
          user_id: plant.user_id,
          plant_id: plant.id,
          type: 'watering',
          message: `Water your ${plant.plant_name}! It has been ${daysSinceLastWater} days.`
        });
      }

      const { data: lastFert } = await supabase
        .from('notifications')
        .select('created_at')
        .eq('plant_id', plant.id)
        .eq('type', 'fertilizing')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const daysSinceLastFert = lastFert
        ? Math.floor((new Date() - new Date(lastFert.created_at)) / (1000 * 60 * 60 * 24))
        : fertilizingDays + 1;

      if (daysSinceLastFert >= fertilizingDays) {
        notifications.push({
          user_id: plant.user_id,
          plant_id: plant.id,
          type: 'fertilizing',
          message: `Your ${plant.plant_name} needs fertilizing! Keep it thriving.`
        });
      }

      if (repottingMonths && daysSinceAdded % (repottingMonths * 30) < 1) {
        notifications.push({
          user_id: plant.user_id,
          plant_id: plant.id,
          type: 'repotting',
          message: `Consider repotting your ${plant.plant_name} - it may be getting root-bound!`
        });
      }
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
      console.log(`Created ${notifications.length} reminder notifications`);
    }
  } catch (err) {
    console.error('Reminder cron error:', err);
  }
}
