using System.Text.Json;
using College.Api.Models;

namespace College.Api.Services;

public sealed class JsonContentStore(IWebHostEnvironment environment)
{
    private readonly string _dataFile = Path.Combine(environment.ContentRootPath, "data", "content.json");
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    public async Task<T> ReadAsync<T>(Func<ContentData, T> read)
    {
        await _lock.WaitAsync();
        try { return read(await LoadAsync()); }
        finally { _lock.Release(); }
    }

    public async Task<T> UpdateAsync<T>(Func<ContentData, T> update)
    {
        await _lock.WaitAsync();
        try
        {
            var data = await LoadAsync();
            var result = update(data);
            await SaveAsync(data);
            return result;
        }
        finally { _lock.Release(); }
    }

    private async Task<ContentData> LoadAsync()
    {
        if (!File.Exists(_dataFile)) return SeedData();
        await using var stream = File.OpenRead(_dataFile);
        return await JsonSerializer.DeserializeAsync<ContentData>(stream, _jsonOptions) ?? SeedData();
    }

    private async Task SaveAsync(ContentData data)
    {
        var directory = Path.GetDirectoryName(_dataFile)!;
        Directory.CreateDirectory(directory);
        var temporaryFile = Path.Combine(directory, $"content.{Guid.NewGuid():N}.tmp");
        await using (var stream = File.Create(temporaryFile))
            await JsonSerializer.SerializeAsync(stream, data, _jsonOptions);
        File.Move(temporaryFile, _dataFile, true);
    }

    private static ContentData SeedData() => new()
    {
        Notices =
        [
            new Notice
            {
                Id = "welcome",
                Title = "Welcome to the new college website",
                Body = "Official notices and admissions updates will be published here.",
                Status = "published",
                CreatedAt = DateTimeOffset.Parse("2026-09-16T00:00:00Z"),
                PublishedAt = DateTimeOffset.Parse("2026-09-16T00:00:00Z")
            }
        ]
    };
}
