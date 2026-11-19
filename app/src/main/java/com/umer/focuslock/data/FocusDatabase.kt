package com.umer.focuslock.data

import android.content.Context
import androidx.room.Database
import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Dao
interface SessionDao {
    @Insert suspend fun insert(session: Session)
    @Query("SELECT * FROM sessions ORDER BY startedAt DESC") fun observeAll(): Flow<List<Session>>
    @Query("SELECT COALESCE(SUM(endedAt - startedAt), 0) FROM sessions WHERE completed = 1 AND startedAt >= :since") fun completedMillisSince(since: Long): Flow<Long>
}

@Database(entities = [Session::class], version = 1, exportSchema = false)
abstract class FocusDatabase : RoomDatabase() {
    abstract fun sessionDao(): SessionDao
    companion object {
        @Volatile private var INSTANCE: FocusDatabase? = null
        fun get(context: Context): FocusDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(context.applicationContext, FocusDatabase::class.java, "focuslock.db").build().also { INSTANCE = it }
        }
    }
}
